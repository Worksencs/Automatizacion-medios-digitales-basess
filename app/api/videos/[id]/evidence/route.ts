import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/src/auth";
import { prisma } from "@/src/db";
import { canContributeToVideo } from "@/src/domain/video-production";
import { apiError, protectMutation } from "@/src/security/http";
import { assertSafeExternalUrl } from "@/src/security/urls";

const schema = z.object({ taskId: z.string().uuid().or(z.literal("")).optional(), type: z.enum(["NOTE", "LINK", "CHECKLIST", "FILE_REFERENCE"]), title: z.string().trim().min(3).max(160), description: z.string().trim().min(3).max(4000), url: z.string().trim().max(2000).optional() });
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = protectMutation(request, "video:evidence", 50); if (blocked) return blocked;
  try {
    const user = await requireUser(); if (!canContributeToVideo(user.roleCode)) throw new Error("El usuario no tiene permiso para registrar evidencias.");
    const { id } = await params; const input = schema.parse(Object.fromEntries(await request.formData()));
    await prisma.videoProject.findUniqueOrThrow({ where: { id } });
    if (input.taskId) await prisma.videoTask.findFirstOrThrow({ where: { id: input.taskId, videoProjectId: id } });
    const url = input.url ? assertSafeExternalUrl(input.url).toString() : null;
    if (input.type === "LINK" && !url) throw new Error("Una evidencia de tipo enlace requiere una URL.");
    await prisma.videoEvidence.create({ data: { videoProjectId: id, taskId: input.taskId || null, authorId: user.id, type: input.type, title: input.title, description: input.description, url } });
    revalidatePath(`/videos/${id}`);
    return NextResponse.redirect(new URL(`/videos/${id}#evidencias`, request.url), 303);
  } catch (error) { return apiError(error); }
}
