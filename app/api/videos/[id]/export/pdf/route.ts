import { requireUser } from "@/src/auth";
import { prisma } from "@/src/db";
import { buildEditorialPdf, editorialPdfFilename } from "@/src/services/editorial-pdf";
import { apiError } from "@/src/security/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const project = await prisma.videoProject.findUniqueOrThrow({ where: { id }, include: { outlet: true, contentVariant: true, adminApprovedBy: true, tasks: { orderBy: { order: "asc" } } } });
    if (project.outputKind !== "EDITORIAL_DOCUMENT") return Response.json({ error: "Este producto es audiovisual y no tiene salida PDF." }, { status: 400 });
    if (project.progress < 100) return Response.json({ error: "El equipo debe completar todos los entregables antes de generar el PDF." }, { status: 409 });
    const pdf = buildEditorialPdf({
      outlet: project.outlet.name,
      headline: project.contentVariant.headline,
      hook: project.contentVariant.hook,
      productType: project.productType ?? "Documento editorial",
      objective: project.objective ?? "",
      audience: project.audience ?? "",
      pageSize: project.pageSize === "A4" ? "A4" : "Carta",
      documentStyle: project.documentStyle ?? "Nota informativa",
      productionNotes: project.productionNotes,
      status: project.agentRunStatus,
      approvedBy: project.adminApprovedBy?.name,
      tasks: project.tasks.map((task) => ({ order: task.order, title: task.title, deliverable: task.deliverable })),
    });
    return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${editorialPdfFilename(project.outlet.name)}"`, "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
