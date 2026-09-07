import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/src/auth";
import { prisma } from "@/src/db";
import { canContributeToVideo, getProductionTaskBlueprints, productionDefaultsForFormat } from "@/src/domain/video-production";
import { apiError, protectMutation } from "@/src/security/http";

const schema = z.object({ contentVariantId: z.string().uuid() });
const responsibility: Record<string, string> = {
  REPORTERO: "Brief, verificación y registro de producción",
  EDITOR_MARCA: "Guion, plan visual y edición de marca",
  EDITOR_SENIOR: "Control factual, de riesgo y calidad editorial",
  DIRECCION: "Decisión y visto bueno final",
  ADMIN: "Supervisión operativa",
};

export async function POST(request: Request) {
  const blocked = protectMutation(request, "video:create", 20);
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    if (!canContributeToVideo(user.roleCode)) throw new Error("El usuario no tiene permiso para iniciar producciones de video.");
    const contentType = request.headers.get("content-type") ?? "";
    const raw = contentType.includes("application/json") ? await request.json() : Object.fromEntries(await request.formData());
    const { contentVariantId } = schema.parse(raw);
    const existing = await prisma.videoProject.findUnique({ where: { contentVariantId } });
    if (existing) return contentType.includes("application/json") ? NextResponse.json({ project: existing }) : NextResponse.redirect(new URL(`/videos/${existing.id}`, request.url), 303);
    const variant = await prisma.contentVariant.findUniqueOrThrow({ where: { id: contentVariantId }, include: { outlet: true, trend: true } });
    const users = await prisma.user.findMany({ where: { active: true, deletedAt: null, role: { code: { in: ["REPORTERO", "EDITOR_MARCA", "EDITOR_SENIOR", "DIRECCION", "ADMIN"] } } }, include: { role: true }, orderBy: { name: "asc" } });
    const pick = (role: string) => users.find((candidate) => candidate.role.code === role && (role !== "EDITOR_MARCA" || candidate.outletId === variant.outletId)) ?? users.find((candidate) => candidate.role.code === role);
    const chosen = [pick("REPORTERO"), pick("EDITOR_MARCA"), pick("EDITOR_SENIOR"), pick("DIRECCION"), user].filter((candidate, index, all): candidate is NonNullable<typeof candidate> => Boolean(candidate) && all.findIndex((item) => item?.id === candidate?.id) === index);
    const assignees = new Map(chosen.map((candidate) => [candidate.role.code, candidate.id]));
    const productionDefaults = productionDefaultsForFormat(variant.recommendedFormat);
    const taskBlueprints = getProductionTaskBlueprints(productionDefaults.outputKind);
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.videoProject.create({ data: { contentVariantId, workflowRunId: variant.workflowRunId, outletId: variant.outletId, title: `${variant.outlet.name} · ${variant.headline}`, ...productionDefaults } });
      if (chosen.length) await tx.videoParticipant.createMany({ data: chosen.map((candidate) => ({ videoProjectId: created.id, userId: candidate.id, responsibility: responsibility[candidate.role.code] ?? "Colaboración editorial" })) });
      await tx.videoTask.createMany({ data: taskBlueprints.map((task) => ({ videoProjectId: created.id, ...task, assigneeId: assignees.get(task.assignedRole) })) });
      await tx.videoEvidence.create({ data: { videoProjectId: created.id, authorId: user.id, type: "STATUS_CHANGE", title: "Producción iniciada", description: `Se creó el flujo ${productionDefaults.outputKind === "EDITORIAL_DOCUMENT" ? "de documento PDF" : productionDefaults.outputKind === "SOCIAL_CARD" ? "de tarjeta gráfica HTML" : "audiovisual"} para ${variant.outlet.name}.` } });
      return created;
    });
    revalidatePath("/videos"); revalidatePath("/ordenes");
    return contentType.includes("application/json") ? NextResponse.json({ project }, { status: 201 }) : NextResponse.redirect(new URL(`/videos/${project.id}`, request.url), 303);
  } catch (error) { return apiError(error); }
}
