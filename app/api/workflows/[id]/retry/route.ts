import { NextResponse } from "next/server";
import { requireUser } from "@/src/auth";
import { prisma } from "@/src/db";
import { apiError, protectMutation } from "@/src/security/http";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { const blocked = protectMutation(request, "workflow:retry", 10); if (blocked) return blocked; try { await requireUser(); const { id } = await params; const run = await prisma.workflowRun.findUniqueOrThrow({ where: { id } }); if (run.status !== "FAILED") throw new Error("Solo se pueden reintentar flujos fallidos."); const job = await prisma.job.upsert({ where: { idempotencyKey: `workflow:${id}` }, create: { type: "EDITORIAL_WORKFLOW", payload: { workflowRunId: id }, idempotencyKey: `workflow:${id}` }, update: { status: "PENDING", availableAt: new Date(), lastError: null, lockedAt: null, lockedBy: null } }); return NextResponse.json({ job }, { status: 202 }); } catch (error) { return apiError(error); } }
