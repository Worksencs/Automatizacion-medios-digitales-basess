import { z } from "zod";

export const scoreInputSchema = z.object({
  velocity: z.number().min(0).max(100),
  recurrence: z.number().min(0).max(100),
  sourceQuality: z.number().min(0).max(100),
  guatemalaRelevance: z.number().min(0).max(100),
  evidence: z.record(z.string(), z.unknown()).default({}),
});

export type ScoreInput = z.infer<typeof scoreInputSchema>;
export const SCORE_FORMULA_VERSION = "1.0.0";
export const SCORE_WEIGHTS = { velocity: 0.35, recurrence: 0.25, sourceQuality: 0.2, guatemalaRelevance: 0.2 } as const;

export function calculateTrendScore(raw: ScoreInput) {
  const input = scoreInputSchema.parse(raw);
  const contributions = {
    velocity: input.velocity * SCORE_WEIGHTS.velocity,
    recurrence: input.recurrence * SCORE_WEIGHTS.recurrence,
    sourceQuality: input.sourceQuality * SCORE_WEIGHTS.sourceQuality,
    guatemalaRelevance: input.guatemalaRelevance * SCORE_WEIGHTS.guatemalaRelevance,
  };
  const total = Math.round(Object.values(contributions).reduce((sum, value) => sum + value, 0));
  return {
    total,
    partials: { velocity: input.velocity, recurrence: input.recurrence, sourceQuality: input.sourceQuality, guatemalaRelevance: input.guatemalaRelevance },
    contributions,
    evidence: input.evidence,
    formulaVersion: SCORE_FORMULA_VERSION,
    explanation: `Velocidad ${input.velocity}/100 (35%), recurrencia ${input.recurrence}/100 (25%), diversidad/calidad ${input.sourceQuality}/100 (20%) y relevancia para Guatemala ${input.guatemalaRelevance}/100 (20%). Total determinista: ${total}/100.`,
    calculatedAt: new Date(),
  };
}
