import { requireUser } from "@/src/auth";
import { prisma } from "@/src/db";
import { isProductionBriefReady } from "@/src/domain/video-production";
import { apiError, protectMutation } from "@/src/security/http";
import { runVideoAgentTeam, type AgentStreamEvent } from "@/src/services/video-agent-team";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = protectMutation(request, "video:agents", 10); if (blocked) return blocked;
  try {
    const user = await requireUser();
    if (!["ADMIN", "DIRECCION"].includes(user.roleCode)) throw new Error("El usuario no tiene permiso para iniciar al equipo AI.");
    const { id } = await params;
    const project = await prisma.videoProject.findUniqueOrThrow({ where: { id } });
    if (!isProductionBriefReady(project)) throw new Error("Describe la solicitud, define producto, objetivo, audiencia y plataforma, y adjunta la imagen principal antes de iniciar.");
    if (project.agentRunStatus === "RUNNING") throw new Error("El equipo AI ya está trabajando en esta producción.");
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: AgentStreamEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        try { await runVideoAgentTeam(id, send); controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete" })}\n\n`)); }
        catch (error) { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Error desconocido" })}\n\n`)); }
        finally { controller.close(); }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
  } catch (error) { return apiError(error); }
}
