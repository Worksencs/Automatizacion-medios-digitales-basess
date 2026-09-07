import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/src/auth";
import { prisma } from "@/src/db";
import { makeDedupeKey, normalizeTitle } from "@/src/domain/dedupe";
import { getProductionTaskBlueprints, type ProductionOutputKind } from "@/src/domain/video-production";
import { apiError, protectMutation } from "@/src/security/http";
import { assertSafeExternalUrl } from "@/src/security/urls";

const schema = z.object({
  title: z.string().trim().min(5).max(240),
  outletId: z.string().uuid(),
  productionNotes: z.string().trim().min(10).max(1000),
  outputKind: z.enum(["AUDIOVISUAL", "EDITORIAL_DOCUMENT", "SOCIAL_CARD"]),
  productType: z.string().trim().min(2).max(120),
  objective: z.string().trim().min(5).max(500),
  audience: z.string().trim().min(3).max(200),
  primaryPlatform: z.string().trim().min(2).max(120),
  durationSeconds: z.number().int().min(10).max(3600).optional(),
  aspectRatio: z.enum(["16:9", "9:16", "4:5", "1:1"]).optional(),
  pageSize: z.enum(["Carta", "A4"]).optional(),
  documentStyle: z.enum(["Nota informativa", "Reportaje", "Boletín", "Informe editorial"]).optional(),
  sourceUrl: z.string().trim().max(2000).optional().default(""),
  sourceName: z.string().trim().max(160).optional().default(""),
  isFictional: z.boolean().optional().default(false),
});

const responsibility: Record<string, string> = {
  REPORTERO: "Brief, verificación y registro de producción",
  EDITOR_MARCA: "Guion, plan visual y edición de marca",
  EDITOR_SENIOR: "Control factual, de riesgo y calidad editorial",
  DIRECCION: "Decisión y visto bueno final",
  ADMIN: "Supervisión operativa",
};

function recommendedFormat(outputKind: ProductionOutputKind, productType: string) {
  if (outputKind === "EDITORIAL_DOCUMENT") return "Nota web";
  if (outputKind === "SOCIAL_CARD") return productType === "Comparativa visual" ? "Carrusel" : "Post de imagen";
  return /reel|short|historia/i.test(productType) ? "Reel" : "Video explicativo";
}

export async function POST(request: Request) {
  const blocked = protectMutation(request, "order:create", 15);
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    if (!["ADMIN", "DIRECCION"].includes(user.roleCode)) throw new Error("Solo Administración o Dirección pueden registrar órdenes de producción.");
    const data = schema.parse(await request.json());
    const outlet = await prisma.outlet.findUnique({ where: { id: data.outletId } });
    if (!outlet?.active) throw new Error("El medio seleccionado no está disponible.");
    const sourceUrl = data.sourceUrl ? assertSafeExternalUrl(data.sourceUrl).toString() : null;
    const outputKind = data.outputKind as ProductionOutputKind;
    const primaryPlatform = outputKind === "EDITORIAL_DOCUMENT" ? "Documento PDF" : data.primaryPlatform;
    const users = await prisma.user.findMany({ where: { active: true, deletedAt: null, role: { code: { in: ["REPORTERO", "EDITOR_MARCA", "EDITOR_SENIOR", "DIRECCION", "ADMIN"] } } }, include: { role: true }, orderBy: { name: "asc" } });
    const pick = (role: string) => users.find((candidate) => candidate.role.code === role && (role !== "EDITOR_MARCA" || candidate.outletId === outlet.id)) ?? users.find((candidate) => candidate.role.code === role);
    const chosen = [pick("REPORTERO"), pick("EDITOR_MARCA"), pick("EDITOR_SENIOR"), pick("DIRECCION"), user].filter((candidate, index, all): candidate is NonNullable<typeof candidate> => Boolean(candidate) && all.findIndex((item) => item?.id === candidate?.id) === index);
    const assignees = new Map(chosen.map((candidate) => [candidate.role.code, candidate.id]));
    const taskBlueprints = getProductionTaskBlueprints(outputKind);
    const nonce = randomUUID();

    const project = await prisma.$transaction(async (tx) => {
      const trend = await tx.trend.create({ data: { title: data.title, normalizedTitle: normalizeTitle(data.title), description: data.productionNotes, originUrl: sourceUrl, sourceName: data.sourceName || "Orden directa", suggestedOutletId: outlet.id, userComment: data.productionNotes, status: "DRAFTS_READY", dedupeKey: makeDedupeKey(data.title, `https://orders.nexo.invalid/${nonce}`), isFictional: data.isFictional } });
      if (sourceUrl) await tx.trendSource.create({ data: { trendId: trend.id, title: data.sourceName || data.title, url: sourceUrl, domain: new URL(sourceUrl).hostname, sourceType: "OTHER", excerpt: data.productionNotes.slice(0, 500), confidence: 50, isPrimary: false } });
      const run = await tx.workflowRun.create({ data: { trendId: trend.id, status: "DRAFTS_READY", idempotencyKey: `direct-order:${nonce}`, completedAt: new Date() } });
      const variant = await tx.contentVariant.create({ data: { trendId: trend.id, workflowRunId: run.id, outletId: outlet.id, headline: data.title, hook: data.objective, angle: data.productionNotes, socialCaption: "", body: "", recommendedFormat: recommendedFormat(outputKind, data.productType), callToAction: "Revisión humana requerida antes de publicar.", sourceIds: [], factIds: [], confidence: sourceUrl ? 50 : 0, riskLevel: data.isFictional ? "LOW" : "MEDIUM", warnings: data.isFictional ? ["Contenido marcado como ficticio"] : ["Verificación de fuentes pendiente"], reviewClaims: [], status: "DRAFT" } });
      const created = await tx.videoProject.create({ data: { contentVariantId: variant.id, workflowRunId: run.id, outletId: outlet.id, title: `${outlet.name} · ${data.title}`, outputKind, productType: data.productType, objective: data.objective, audience: data.audience, productionNotes: data.productionNotes, primaryPlatform, durationSeconds: outputKind === "AUDIOVISUAL" ? data.durationSeconds ?? 60 : null, aspectRatio: outputKind === "EDITORIAL_DOCUMENT" ? null : data.aspectRatio ?? (outputKind === "SOCIAL_CARD" ? "4:5" : "16:9"), resolution: outputKind === "AUDIOVISUAL" ? "1080p" : null, captionStyle: outputKind === "EDITORIAL_DOCUMENT" ? null : "Informativos", voiceStyle: outputKind === "AUDIOVISUAL" ? "Informativa" : null, pageSize: outputKind === "EDITORIAL_DOCUMENT" ? data.pageSize ?? "Carta" : null, documentStyle: outputKind === "EDITORIAL_DOCUMENT" ? data.documentStyle ?? "Nota informativa" : null } });
      if (chosen.length) await tx.videoParticipant.createMany({ data: chosen.map((candidate) => ({ videoProjectId: created.id, userId: candidate.id, responsibility: responsibility[candidate.role.code] ?? "Colaboración editorial" })) });
      await tx.videoTask.createMany({ data: taskBlueprints.map((task) => ({ videoProjectId: created.id, ...task, assigneeId: assignees.get(task.assignedRole) })) });
      await tx.videoEvidence.create({ data: { videoProjectId: created.id, authorId: user.id, type: "STATUS_CHANGE", title: "Orden de trabajo registrada", description: `${user.name} solicitó ${data.productType} para ${outlet.name}. El equipo AI todavía no ha comenzado.` } });
      return created;
    });

    revalidatePath("/ordenes");
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
