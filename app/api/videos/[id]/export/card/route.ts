import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireUser } from "@/src/auth";
import { prisma } from "@/src/db";
import { apiError } from "@/src/security/http";
import { buildSocialCardHtml, extractSocialCardColorCopy, extractSocialCardCopy } from "@/src/services/social-card-html";

function filename(outlet: string) {
  const slug = outlet.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "nexo"}-tarjeta-social.html`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const project = await prisma.videoProject.findUniqueOrThrow({
      where: { id },
      include: { outlet: true, contentVariant: true, tasks: { orderBy: { order: "asc" } } },
    });
    if (project.outputKind !== "SOCIAL_CARD") return Response.json({ error: "Este producto no es una tarjeta gráfica HTML." }, { status: 400 });
    if (project.progress < 100) return Response.json({ error: "El equipo debe completar todos los entregables antes de generar la tarjeta." }, { status: 409 });
    const copyDeliverable = project.tasks.find((task) => task.order === 3)?.deliverable;
    const copy = extractSocialCardCopy(copyDeliverable, { headline: project.contentVariant.headline, hook: project.contentVariant.hook });
    const generatedColorCopy = extractSocialCardColorCopy(copyDeliverable, { headline: project.contentVariant.headline, hook: project.contentVariant.hook });
    const hasAdminCopy = Boolean(project.cardBaseText?.trim() || project.cardAccentText?.trim());
    const colorCopy = hasAdminCopy ? { base: project.cardBaseText?.trim() ?? "", accent: project.cardAccentText?.trim() ?? "", impact: project.cardImpactText?.trim() ?? "", question: project.cardQuestion?.trim() ?? "" } : generatedColorCopy;
    let subjectImageDataUrl: string | null = null;
    if (project.subjectImagePath && project.subjectImageMime) {
      const uploadRoot = path.resolve(process.cwd(), "public", "uploads", id);
      const imagePath = path.resolve(process.cwd(), "public", project.subjectImagePath.replace(/^\/+/, ""));
      if (imagePath.startsWith(`${uploadRoot}${path.sep}`)) {
        const image = await readFile(imagePath);
        subjectImageDataUrl = `data:${project.subjectImageMime};base64,${image.toString("base64")}`;
      }
    }
    const html = buildSocialCardHtml({
      outlet: project.outlet.name,
      headline: hasAdminCopy ? colorCopy.base : copy.headline,
      hook: hasAdminCopy ? colorCopy.accent : copy.hook,
      productType: project.productType ?? "Tarjeta informativa",
      platform: project.primaryPlatform ?? "Redes sociales",
      aspectRatio: project.aspectRatio ?? "1:1",
      objective: project.objective ?? "",
      progress: project.progress,
      approved: project.agentRunStatus === "COMPLETED",
      subjectImageDataUrl,
      breakingBadge: project.breakingBadge,
      colorCopy,
    });
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="${filename(project.outlet.name)}"`, "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
