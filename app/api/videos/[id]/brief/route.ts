import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/src/auth";
import { prisma } from "@/src/db";
import { assessVisualCopyAlignment, parseSubjectImageAnalysis } from "@/src/domain/subject-image-analysis";
import { getProductionTaskBlueprints } from "@/src/domain/video-production";
import { socialAspectRatioForPlatform } from "@/src/domain/insomnio-social-template";
import { apiError, protectMutation } from "@/src/security/http";

const schema = z.object({
  outputKind: z.enum(["AUDIOVISUAL", "EDITORIAL_DOCUMENT", "SOCIAL_CARD"]),
  productType: z.string().trim().min(3).max(100),
  objective: z.string().trim().min(5).max(500),
  audience: z.string().trim().min(3).max(200),
  durationSeconds: z.coerce.number().int().min(10).max(3600),
  primaryPlatform: z.string().trim().min(2).max(100),
  productionNotes: z.string().trim().min(10, "Describe claramente qué necesitas que produzca el equipo.").max(1000),
  aspectRatio: z.enum(["16:9", "9:16", "4:5", "1:1"]),
  resolution: z.enum(["1080p", "4K"]),
  captionStyle: z.enum(["Informativos", "Dinámicos", "Sin subtítulos"]),
  voiceStyle: z.enum(["Informativa", "Cálida", "Enérgica"]),
  pageSize: z.enum(["Carta", "A4"]),
  documentStyle: z.enum(["Nota informativa", "Reportaje", "Boletín", "Informe editorial"]),
  breakingBadge: z.enum(["NONE", "BREAKING", "URGENT"]).optional().default("NONE"),
  cardBaseText: z.string().trim().max(100).optional().default(""),
  cardAccentText: z.string().trim().max(100).optional().default(""),
  cardImpactText: z.string().trim().max(100).optional().default(""),
  cardQuestion: z.string().trim().max(80).optional().default(""),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = protectMutation(request, "video:brief", 30); if (blocked) return blocked;
  try {
    const user = await requireUser();
    if (!["ADMIN", "DIRECCION"].includes(user.roleCode)) throw new Error("El usuario no tiene permiso: sólo Administración o Dirección define el encargo.");
    const { id } = await params;
    const input = schema.parse(await request.json());
    const existing = await prisma.videoProject.findUniqueOrThrow({ where: { id }, select: { subjectImagePath: true, subjectImageAnalysis: true } });
    const visualAnalysis = parseSubjectImageAnalysis(existing.subjectImageAnalysis);
    const visualAlignment = assessVisualCopyAlignment(visualAnalysis, [input.cardBaseText, input.cardAccentText, input.cardImpactText, input.cardQuestion]);
    if (input.outputKind === "SOCIAL_CARD" && existing.subjectImagePath && visualAlignment === "CONFLICT") {
      throw new Error("El texto de la tarjeta no coincide con lo observado en la imagen. Revisa la lectura visual o aplica la propuesta de Ojo AI antes de guardar.");
    }
    const normalized = input.outputKind === "EDITORIAL_DOCUMENT"
      ? { ...input, primaryPlatform: "Documento PDF" }
      : input.outputKind === "SOCIAL_CARD"
        ? { ...input, aspectRatio: socialAspectRatioForPlatform(input.primaryPlatform) ?? input.aspectRatio }
        : input;
    const blueprints = getProductionTaskBlueprints(normalized.outputKind);
    const [project] = await prisma.$transaction([
      prisma.videoProject.update({ where: { id }, data: { ...normalized, agentRunStatus: "IDLE", status: "PLANNING", progress: 0, currentStage: "BRIEF", completedAt: null, adminApprovedAt: null, adminApprovedById: null } }),
      ...blueprints.map((task) => prisma.videoTask.upsert({ where: { videoProjectId_order: { videoProjectId: id, order: task.order } }, create: { videoProjectId: id, ...task, status: "PENDING" }, update: { title: task.title, description: task.description, stage: task.stage, assignedRole: task.assignedRole, agentKey: task.agentKey, agentName: task.agentName, status: "PENDING", deliverable: null, completedAt: null } })),
      prisma.videoAgentActivity.create({ data: { videoProjectId: id, agentKey: "human_admin", agentName: user.name, agentRole: "Administrador humano", action: "Encargo definido", detail: normalized.outputKind === "EDITORIAL_DOCUMENT" ? `${normalized.productType} · ${normalized.documentStyle} · Documento PDF ${normalized.pageSize}` : normalized.outputKind === "SOCIAL_CARD" ? `${normalized.productType} · Tarjeta HTML ${normalized.aspectRatio} · ${normalized.primaryPlatform}${visualAlignment === "ALIGNED" ? " · texto e imagen coherentes" : ""}` : `${normalized.productType} · ${normalized.durationSeconds} s · ${normalized.primaryPlatform}`, status: "SYSTEM", progress: 0 } }),
    ]);
    const tasks = await prisma.videoTask.findMany({ where: { videoProjectId: id }, orderBy: { order: "asc" } });
    return NextResponse.json({ project, tasks });
  } catch (error) { return apiError(error); }
}
