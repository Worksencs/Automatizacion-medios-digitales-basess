import { z } from "zod";
import { requireUser } from "@/src/auth";
import { prisma } from "@/src/db";
import { apiError, protectMutation } from "@/src/security/http";
import { processWorkflowRun, type WorkflowStreamEvent } from "@/src/services/workflow";

export const dynamic = "force-dynamic";
const idSchema = z.string().uuid();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = protectMutation(request, "workflow:run-live", 10); if (blocked) return blocked;
  try {
    const user = await requireUser();
    if (!["ADMIN", "DIRECCION", "EDITOR_SENIOR", "EDITOR_MARCA", "REPORTERO"].includes(user.roleCode)) throw new Error("El usuario no tiene permiso para iniciar el equipo editorial.");
    const { id: rawId } = await params;
    const id = idSchema.parse(rawId);
    const run = await prisma.workflowRun.findUniqueOrThrow({ where: { id } });
    if (!["DETECTED", "FAILED", "EVIDENCE_INCOMPLETE"].includes(run.status)) throw new Error(`El flujo ya se encuentra en ${run.status}.`);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: WorkflowStreamEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        try {
          await processWorkflowRun(id, send);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete" })}\n\n`));
        } catch (error) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Error desconocido" })}\n\n`));
        } finally { controller.close(); }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
  } catch (error) { return apiError(error); }
}
