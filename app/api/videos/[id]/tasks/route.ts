import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/src/auth";
import { prisma } from "@/src/db";
import { canUpdateVideoTask, requireCompletionEvidence, summarizeVideoProgress } from "@/src/domain/video-production";
import { apiError, protectMutation } from "@/src/security/http";

const schema = z.object({ taskId: z.string().uuid(), status: z.enum(["PENDING", "IN_PROGRESS", "BLOCKED", "DONE"]), deliverable: z.string().trim().max(4000).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = protectMutation(request, "video:task", 50); if (blocked) return blocked;
  try {
    const user = await requireUser(); const { id } = await params;
    const contentType = request.headers.get("content-type") ?? "";
    const raw = contentType.includes("application/json") ? await request.json() : Object.fromEntries(await request.formData());
    const input = schema.parse(raw);
    const task = await prisma.videoTask.findFirstOrThrow({ where: { id: input.taskId, videoProjectId: id }, include: { _count: { select: { evidences: true } } } });
    if (!canUpdateVideoTask({ role: user.roleCode, assignedRole: task.assignedRole, userId: user.id, assigneeId: task.assigneeId })) throw new Error("El usuario no tiene permiso para actualizar esta tarea.");
    requireCompletionEvidence(input.status, input.deliverable, task._count.evidences);
    await prisma.$transaction(async (tx) => {
      await tx.videoTask.update({ where: { id: task.id }, data: { status: input.status, deliverable: input.deliverable || task.deliverable, completedAt: input.status === "DONE" ? new Date() : null } });
      await tx.videoEvidence.create({ data: { videoProjectId: id, taskId: task.id, authorId: user.id, type: "STATUS_CHANGE", title: `${task.title}: ${input.status}`, description: input.deliverable?.trim() || `Estado actualizado por ${user.name}.` } });
      const tasks = await tx.videoTask.findMany({ where: { videoProjectId: id }, select: { order: true, stage: true, status: true } });
      const summary = summarizeVideoProgress(tasks);
      await tx.videoProject.update({ where: { id }, data: { ...summary, completedAt: summary.status === "READY" ? new Date() : null } });
    });
    revalidatePath(`/videos/${id}`); revalidatePath("/videos");
    return contentType.includes("application/json") ? NextResponse.json({ ok: true }) : NextResponse.redirect(new URL(`/videos/${id}`, request.url), 303);
  } catch (error) { return apiError(error); }
}
