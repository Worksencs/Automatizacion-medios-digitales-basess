import { NextResponse } from "next/server";
import { requireUser } from "@/src/auth";
import { prisma } from "@/src/db";
import { enqueueWorkflow } from "@/src/services/workflow";
import { apiError, protectMutation } from "@/src/security/http";
export async function POST(request: Request) { const blocked = protectMutation(request, "workflow:start", 20); if (blocked) return blocked; try { await requireUser(); const type = request.headers.get("content-type") ?? ""; const body = type.includes("application/json") ? await request.json() : Object.fromEntries(await request.formData()); const trendId = String(body.trendId ?? ""); await prisma.trend.findUniqueOrThrow({ where: { id: trendId } }); const run = await enqueueWorkflow(trendId); return type.includes("application/json") ? NextResponse.json({ run }, { status: 202 }) : NextResponse.redirect(new URL(`/expedientes/${trendId}`, request.url), 303); } catch (error) { return apiError(error); } }
