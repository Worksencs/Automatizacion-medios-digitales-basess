import { calculateTrendScore, type ScoreInput } from "@/src/domain/scoring";
import { evaluateEvidence, type EvidenceSource } from "@/src/domain/evidence";
import { assertTransition, type WorkflowStatus } from "@/src/domain/state-machine";
import { classifyEditorialRisk, maxRisk, type RiskLevel } from "@/src/domain/risk";
import { validateApproval, type RoleCode } from "@/src/domain/permissions";
import type { OpenAIAdapter, EditorialAgentInput } from "@/src/adapters/openai";
import type { NotionAdapter } from "@/src/adapters/notion";

export async function executeDemoPipeline(input: EditorialAgentInput & { score: ScoreInput }, dependencies: { openai: OpenAIAdapter; notion: NotionAdapter }) {
  const history: WorkflowStatus[] = ["DETECTED"];
  const go = (next: WorkflowStatus) => { assertTransition(history.at(-1)!, next); history.push(next); };
  go("SCORING"); const score = calculateTrendScore(input.score); go("SCORED"); go("INVESTIGATING"); const generated = await dependencies.openai.runEditorialWorkflow(input);
  const evidenceSources: EvidenceSource[] = input.sources.map((source) => ({ id: source.id, domain: source.domain, isPrimary: source.isPrimary, accessible: true })); const evidence = evaluateEvidence(evidenceSources, generated.investigation.confirmedFacts.length);
  if (!evidence.ready) { go("EVIDENCE_INCOMPLETE"); return { history, score, evidence, generated, notion: null, risk: null }; }
  go("EVIDENCE_READY"); go("GENERATING_VARIANTS"); let risk: RiskLevel = "LOW"; for (const variant of generated.variants) risk = maxRisk(risk, classifyEditorialRisk({ title: variant.headline, body: variant.body, suggested: variant.suggestedRisk }).level); go("DRAFTS_READY"); go("SYNCING_NOTION"); const notion = await dependencies.notion.syncTask({ workflowId: "demo-workflow", title: input.title, score: score.total, status: "AWAITING_APPROVAL", investigationSummary: generated.investigation.summary, confidence: generated.investigation.confidence, risk, sourceLinks: input.sources.map((source) => source.url), contradictions: generated.investigation.contradictions.map((item) => item.description), variants: generated.variants.map((variant) => ({ outlet: variant.outletSlug, headline: variant.headline, body: variant.body })), createdAt: new Date().toISOString(), dossierUrl: "http://localhost:3000/expedientes/demo" }); go("AWAITING_APPROVAL"); return { history, score, evidence, generated, notion, risk };
}
export function decideDemoApproval(input: { status: WorkflowStatus; action: "APPROVE" | "REJECT" | "REQUEST_CHANGES"; role: RoleCode; risk: RiskLevel; comment?: string; confirmed?: boolean }) { const target: WorkflowStatus = input.action === "APPROVE" ? "APPROVED" : input.action === "REJECT" ? "REJECTED" : "NEEDS_REVISION"; assertTransition(input.status, target); if (input.action === "APPROVE") validateApproval({ role: input.role, risk: input.risk, comment: input.comment, confirmed: input.confirmed }); return target; }
