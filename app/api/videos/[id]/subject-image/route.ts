import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/src/auth";
import { prisma } from "@/src/db";
import { apiError, protectMutation } from "@/src/security/http";
import { analyzeSubjectImage } from "@/src/services/subject-image-analysis";

const idSchema = z.string().uuid();
const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const maxBytes = 8 * 1024 * 1024;
const analysisContextSchema = z.object({
  productionNotes: z.string().max(1000).optional(), objective: z.string().max(500).optional(), audience: z.string().max(200).optional(),
  cardBaseText: z.string().max(100).optional(), cardAccentText: z.string().max(100).optional(), cardImpactText: z.string().max(100).optional(), cardQuestion: z.string().max(80).optional(),
});

function editorialContext(project: {
  outputKind: string; productType: string | null; objective: string | null; audience: string | null;
  productionNotes: string | null;
  cardBaseText: string | null; cardAccentText: string | null; cardImpactText: string | null; cardQuestion: string | null;
}) {
  return {
    outputKind: project.outputKind,
    productType: project.productType,
    objective: project.objective,
    audience: project.audience,
    productionRequest: project.productionNotes,
    visibleCardCopy: [project.cardBaseText, project.cardAccentText, project.cardImpactText, project.cardQuestion].filter(Boolean),
  };
}

async function readSafeProjectImage(project: { id: string; subjectImagePath: string | null }) {
  if (!project.subjectImagePath) throw new Error("Adjunta una imagen antes de solicitar el análisis visual.");
  const uploadRoot = path.resolve(process.cwd(), "public", "uploads", project.id);
  const imagePath = path.resolve(process.cwd(), "public", project.subjectImagePath.replace(/^\/+/, ""));
  if (!imagePath.startsWith(`${uploadRoot}${path.sep}`)) throw new Error("La ruta de la imagen no es válida.");
  return readFile(imagePath);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = protectMutation(request, "video:subject-image", 20); if (blocked) return blocked;
  try {
    const user = await requireUser();
    if (!["ADMIN", "DIRECCION"].includes(user.roleCode)) throw new Error("El usuario no tiene permiso para adjuntar material visual.");
    const { id: rawId } = await params;
    const id = idSchema.parse(rawId);
    const project = await prisma.videoProject.findUniqueOrThrow({ where: { id } });
    if (project.agentRunStatus === "RUNNING") throw new Error("Espera a que termine la ejecución antes de cambiar la imagen principal.");

    const form = await request.formData();
    const image = form.get("image");
    if (!(image instanceof File)) throw new Error("Selecciona una imagen para continuar.");
    const extension = allowedTypes.get(image.type);
    if (!extension) throw new Error("Formato no permitido. Usa JPG, PNG o WEBP.");
    if (image.size === 0 || image.size > maxBytes) throw new Error("La imagen debe pesar entre 1 byte y 8 MB.");

    const directory = path.join(process.cwd(), "public", "uploads", id);
    const fileName = `subject-1.${extension}`;
    await mkdir(directory, { recursive: true });
    const bytes = Buffer.from(await image.arrayBuffer());
    await writeFile(path.join(directory, fileName), bytes);
    const publicPath = `/uploads/${id}/${fileName}`;
    const requestedContext = {
      ...project,
      productionNotes: typeof form.get("productionNotes") === "string" ? String(form.get("productionNotes")) : project.productionNotes,
      objective: typeof form.get("objective") === "string" ? String(form.get("objective")) : project.objective,
      audience: typeof form.get("audience") === "string" ? String(form.get("audience")) : project.audience,
      cardBaseText: typeof form.get("cardBaseText") === "string" ? String(form.get("cardBaseText")) : project.cardBaseText,
      cardAccentText: typeof form.get("cardAccentText") === "string" ? String(form.get("cardAccentText")) : project.cardAccentText,
      cardImpactText: typeof form.get("cardImpactText") === "string" ? String(form.get("cardImpactText")) : project.cardImpactText,
      cardQuestion: typeof form.get("cardQuestion") === "string" ? String(form.get("cardQuestion")) : project.cardQuestion,
    };

    let analysis = null;
    let analysisWarning = "";
    try {
      analysis = await analyzeSubjectImage({ bytes, mimeType: image.type, fileName: image.name, editorialContext: editorialContext(requestedContext) });
    } catch (error) {
      analysisWarning = error instanceof Error ? error.message : "No se pudo completar el análisis visual.";
    }

    await prisma.$transaction([
      prisma.videoProject.update({ where: { id }, data: { subjectImagePath: publicPath, subjectImageName: image.name.slice(0, 255), subjectImageMime: image.type, subjectImageAnalysis: analysis ?? Prisma.DbNull, subjectImageAnalyzedAt: analysis ? new Date() : null } }),
      prisma.videoEvidence.create({ data: { videoProjectId: id, authorId: user.id, type: "FILE_REFERENCE", title: analysis ? "Imagen principal analizada" : "Imagen principal adjunta", description: analysis ? `${image.name} · Ojo AI detectó: ${analysis.summary}` : `${image.name} · original autorizado, sin transformaciones`, url: publicPath, metadata: { purpose: "SUBJECT_1", mimeType: image.type, size: image.size, analysis: analysis ?? undefined } } }),
      prisma.videoAgentActivity.create({ data: { videoProjectId: id, agentKey: analysis ? "nexo_vision" : "human_admin", agentName: analysis ? "Ojo" : user.name, agentRole: analysis ? "Análisis visual AI" : "Administrador humano", action: analysis ? "Lectura visual completada" : "Imagen principal adjunta", detail: analysis ? `${analysis.summary} Esta lectura será contexto obligatorio para todo el equipo.` : `${image.name} quedó adjunta. ${analysisWarning ? `El análisis visual quedó pendiente: ${analysisWarning}` : "Se analizará durante la producción."}`, status: analysis ? "DONE" : "SYSTEM", progress: project.progress } }),
    ]);
    return Response.json({ path: publicPath, name: image.name, mimeType: image.type, analysis, analysisWarning });
  } catch (error) { return apiError(error); }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = protectMutation(request, "video:subject-image-analysis", 20); if (blocked) return blocked;
  try {
    const user = await requireUser();
    if (!["ADMIN", "DIRECCION"].includes(user.roleCode)) throw new Error("El usuario no tiene permiso para analizar material visual.");
    const { id: rawId } = await params;
    const id = idSchema.parse(rawId);
    const project = await prisma.videoProject.findUniqueOrThrow({ where: { id } });
    if (project.agentRunStatus === "RUNNING") throw new Error("Espera a que termine la ejecución antes de analizar la imagen.");
    if (!project.subjectImageMime || !allowedTypes.has(project.subjectImageMime)) throw new Error("La imagen adjunta no tiene un formato analizable.");
    const bytes = await readSafeProjectImage(project);
    const pendingContext = analysisContextSchema.parse(await request.json().catch(() => ({})));
    const analysis = await analyzeSubjectImage({ bytes, mimeType: project.subjectImageMime, fileName: project.subjectImageName ?? "SUBJECT 1", editorialContext: editorialContext({ ...project, ...pendingContext }) });
    if (!analysis) throw new Error("Activa Claude API para realizar una lectura visual real.");
    await prisma.$transaction([
      prisma.videoProject.update({ where: { id }, data: { subjectImageAnalysis: analysis, subjectImageAnalyzedAt: new Date() } }),
      prisma.videoEvidence.create({ data: { videoProjectId: id, authorId: null, agentKey: "nexo_vision", agentName: "Ojo", type: "NOTE", title: "Lectura visual AI", description: analysis.summary, metadata: { analysis } } }),
      prisma.videoAgentActivity.create({ data: { videoProjectId: id, agentKey: "nexo_vision", agentName: "Ojo", agentRole: "Análisis visual AI", action: "Lectura visual completada", detail: `${analysis.summary} Esta lectura será contexto obligatorio para todo el equipo.`, status: "DONE", progress: project.progress } }),
    ]);
    return Response.json({ analysis });
  } catch (error) { return apiError(error); }
}
