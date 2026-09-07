import "dotenv/config";
import { randomUUID } from "node:crypto";
import { prisma } from "@/src/db";
import { processWorkflowRun } from "@/src/services/workflow";

const workerId = `worker-${randomUUID().slice(0, 8)}`;
async function claimJob() { return prisma.$transaction(async (tx) => { const jobs = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Job" WHERE status = 'PENDING' AND "availableAt" <= NOW() ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1`; const job = jobs[0]; if (!job) return null; return tx.job.update({ where: { id: job.id }, data: { status: "RUNNING", lockedAt: new Date(), lockedBy: workerId, attempts: { increment: 1 } } }); }); }
async function workOnce() { const job = await claimJob(); if (!job) return false; try { const payload = job.payload as { workflowRunId?: string }; if (job.type !== "EDITORIAL_WORKFLOW" || !payload.workflowRunId) throw new Error("Trabajo no reconocido"); await processWorkflowRun(payload.workflowRunId); await prisma.job.update({ where: { id: job.id }, data: { status: "COMPLETED", lockedAt: null, lockedBy: null } }); } catch (error) { const message = error instanceof Error ? error.message : "Error desconocido"; const retry = job.attempts < job.maxAttempts; await prisma.job.update({ where: { id: job.id }, data: { status: retry ? "PENDING" : "FAILED", availableAt: new Date(Date.now() + 2 ** job.attempts * 10_000), lockedAt: null, lockedBy: null, lastError: message } }); } return true; }
async function main() { const once = process.argv.includes("--once"); do { const worked = await workOnce(); if (once) break; if (!worked) await new Promise((resolve) => setTimeout(resolve, 1500)); } while (true); }
main().catch((error) => { console.error(error instanceof Error ? error.message : "Worker fatal"); process.exitCode = 1; }).finally(async () => { if (process.argv.includes("--once")) await prisma.$disconnect(); });
