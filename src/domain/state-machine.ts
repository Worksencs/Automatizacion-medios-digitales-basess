export const workflowStates = ["DETECTED", "SCORING", "SCORED", "INVESTIGATING", "EVIDENCE_INCOMPLETE", "EVIDENCE_READY", "GENERATING_VARIANTS", "DRAFTS_READY", "SYNCING_NOTION", "AWAITING_APPROVAL", "APPROVED", "REJECTED", "NEEDS_REVISION", "FAILED", "CANCELLED"] as const;
export type WorkflowStatus = typeof workflowStates[number];

export const allowedTransitions: Record<WorkflowStatus, readonly WorkflowStatus[]> = {
  DETECTED: ["SCORING", "CANCELLED", "FAILED"], SCORING: ["SCORED", "FAILED"], SCORED: ["INVESTIGATING", "CANCELLED", "FAILED"],
  INVESTIGATING: ["EVIDENCE_INCOMPLETE", "EVIDENCE_READY", "FAILED"], EVIDENCE_INCOMPLETE: ["INVESTIGATING", "GENERATING_VARIANTS", "CANCELLED", "FAILED"],
  EVIDENCE_READY: ["GENERATING_VARIANTS", "INVESTIGATING", "FAILED"], GENERATING_VARIANTS: ["DRAFTS_READY", "FAILED"], DRAFTS_READY: ["SYNCING_NOTION", "GENERATING_VARIANTS", "FAILED"],
  SYNCING_NOTION: ["AWAITING_APPROVAL", "FAILED"], AWAITING_APPROVAL: ["APPROVED", "REJECTED", "NEEDS_REVISION", "FAILED"],
  NEEDS_REVISION: ["GENERATING_VARIANTS", "DRAFTS_READY", "CANCELLED"], FAILED: ["SCORING", "INVESTIGATING", "GENERATING_VARIANTS", "SYNCING_NOTION", "CANCELLED"],
  APPROVED: [], REJECTED: ["NEEDS_REVISION"], CANCELLED: [],
};

export function canTransition(from: WorkflowStatus, to: WorkflowStatus) { return allowedTransitions[from].includes(to); }
export function assertTransition(from: WorkflowStatus, to: WorkflowStatus) { if (!canTransition(from, to)) throw new Error(`Transición inválida: ${from} → ${to}`); }
export function requiresHumanActor(to: WorkflowStatus) { return ["APPROVED", "REJECTED", "NEEDS_REVISION"].includes(to); }
