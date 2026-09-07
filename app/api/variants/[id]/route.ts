import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/src/auth";
import { prisma } from "@/src/db";
import { hasPermission } from "@/src/domain/permissions";
import { apiError, protectMutation } from "@/src/security/http";
const schema = z.object({ headline: z.string().min(5).max(300), hook: z.string().min(5).max(1000), angle: z.string().min(3).max(300), socialCaption: z.string().min(5).max(4000), body: z.string().min(10).max(30000), recommendedFormat: z.string().min(3).max(80), callToAction: z.string().max(1000) });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { const blocked = protectMutation(request, "variant:edit", 30); if (blocked) return blocked; try { const user = await requireUser(); if (!hasPermission(user.roleCode, "draft:edit")) throw new Error("El usuario no tiene permiso para editar borradores."); const { id } = await params; const before = await prisma.contentVariant.findUniqueOrThrow({ where: { id } }); const data = schema.parse(await request.json()); const updated = await prisma.contentVariant.update({ where: { id }, data }); await prisma.approval.create({ data: { workflowRunId: before.workflowRunId, contentVariantId: id, userId: user.id, action: "EDIT", comment: "Edición manual de borrador", contentBefore: before as unknown as object, contentAfter: updated as unknown as object, riskAtDecision: before.riskLevel } }); return NextResponse.json({ variant: updated }); } catch (error) { return apiError(error); } }
