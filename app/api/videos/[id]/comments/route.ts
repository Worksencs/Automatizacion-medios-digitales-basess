import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/src/auth";
import { prisma } from "@/src/db";
import { canContributeToVideo } from "@/src/domain/video-production";
import { apiError, protectMutation } from "@/src/security/http";

const schema = z.object({ body: z.string().trim().min(2).max(2000) });
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = protectMutation(request, "video:comment", 50); if (blocked) return blocked;
  try {
    const user = await requireUser(); if (!canContributeToVideo(user.roleCode)) throw new Error("El usuario no tiene permiso para comentar en la producción.");
    const { id } = await params; const input = schema.parse(Object.fromEntries(await request.formData()));
    await prisma.videoProject.findUniqueOrThrow({ where: { id } });
    await prisma.videoComment.create({ data: { videoProjectId: id, authorId: user.id, body: input.body } });
    revalidatePath(`/videos/${id}`);
    return NextResponse.redirect(new URL(`/videos/${id}#comentarios`, request.url), 303);
  } catch (error) { return apiError(error); }
}
