import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/src/auth";
import { prisma } from "@/src/db";
import { apiError, protectMutation } from "@/src/security/http";

const schema = z.object({ action: z.enum(["APPROVE", "REQUEST_CHANGES"]), comment: z.string().trim().max(1000).optional().default("") });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = protectMutation(request, "video:admin-decision", 20); if (blocked) return blocked;
  try {
    const user = await requireUser();
    if (!["ADMIN", "DIRECCION"].includes(user.roleCode)) throw new Error("El usuario no tiene permiso para tomar la decisión final.");
    const { id } = await params;
    const input = schema.parse(await request.json());
    const project = await prisma.videoProject.findUniqueOrThrow({ where: { id } });
    if (project.agentRunStatus !== "WAITING_ADMIN") throw new Error("El paquete todavía no está esperando decisión del administrador.");
    const approved = input.action === "APPROVE";
    await prisma.$transaction([
      prisma.videoProject.update({ where: { id }, data: approved ? { agentRunStatus: "COMPLETED", status: "READY", currentStage: "COMPLETE", completedAt: new Date(), adminApprovedAt: new Date(), adminApprovedById: user.id } : { agentRunStatus: "IDLE", status: "IN_REVIEW", currentStage: "EDITORIAL_REVIEW", completedAt: null, adminApprovedAt: null, adminApprovedById: null } }),
      prisma.videoAgentActivity.create({ data: { videoProjectId: id, agentKey: "human_admin", agentName: user.name, agentRole: "Administrador humano", action: approved ? "Paquete aprobado" : "Ajustes solicitados", detail: input.comment || (approved ? "Aprobación humana registrada. El sistema aún no publica automáticamente." : "El paquete vuelve al equipo AI para una nueva ejecución."), status: "SYSTEM", progress: project.progress } }),
      prisma.videoComment.create({ data: { videoProjectId: id, authorId: user.id, body: input.comment || (approved ? "Paquete audiovisual aprobado por Administración." : "Administración solicitó una nueva versión.") } }),
    ]);
    return NextResponse.json({ status: approved ? "COMPLETED" : "IDLE" });
  } catch (error) { return apiError(error); }
}
