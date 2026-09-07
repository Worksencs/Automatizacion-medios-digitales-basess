import { z } from "zod";

export const subjectImageAnalysisSchema = z.object({
  provider: z.enum(["claude", "openai", "demo"]).default("claude"),
  summary: z.string().trim().min(3).max(1000),
  visibleText: z.array(z.string().trim().min(1).max(180)).max(12).default([]),
  subjects: z.array(z.string().trim().min(1).max(120)).min(1).max(12),
  setting: z.string().trim().max(240).default(""),
  keywords: z.array(z.string().trim().min(2).max(80)).min(3).max(24),
  compatibleTopics: z.array(z.string().trim().min(2).max(180)).min(1).max(10),
  warnings: z.array(z.string().trim().min(2).max(240)).max(10).default([]),
  suggestedCopy: z.object({
    base: z.string().trim().min(3).max(100),
    accent: z.string().trim().min(3).max(100),
    impact: z.string().trim().max(100).default(""),
    question: z.string().trim().max(80).default(""),
  }),
  confidence: z.coerce.number().min(0).max(100).transform((value) => Math.round(value <= 1 ? value * 100 : value)),
});

export type SubjectImageAnalysis = z.infer<typeof subjectImageAnalysisSchema>;
export type VisualCopyAlignment = "UNCHECKED" | "ALIGNED" | "CONFLICT";

const stopWords = new Set([
  "algo", "ante", "como", "con", "contra", "desde", "donde", "esta", "este", "estos", "estas", "entre", "hacia", "hasta", "para", "pero", "porque", "sobre", "solo", "tambien", "tiene", "tienen", "tras", "una", "unas", "uno", "unos", "del", "las", "los", "que", "por", "sus", "más", "mas",
]);

function tokens(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9ñ]+/)
    .filter((token) => token.length >= 4 && !stopWords.has(token));
}

function relatedToken(left: string, right: string) {
  if (left === right) return true;
  const length = Math.min(left.length, right.length, 6);
  return length >= 4 && left.slice(0, length) === right.slice(0, length);
}

export function assessVisualCopyAlignment(analysis: SubjectImageAnalysis | null | undefined, copy: Array<string | null | undefined>): VisualCopyAlignment {
  if (!analysis) return "UNCHECKED";
  const visualTokens = tokens([
    analysis.summary,
    analysis.setting,
    ...analysis.visibleText,
    ...analysis.subjects,
    ...analysis.keywords,
    ...analysis.compatibleTopics,
  ].join(" "));
  const copyTokens = tokens(copy.filter(Boolean).join(" "));
  if (!copyTokens.length || !visualTokens.length) return "UNCHECKED";
  return copyTokens.some((copyToken) => visualTokens.some((visualToken) => relatedToken(copyToken, visualToken))) ? "ALIGNED" : "CONFLICT";
}

export function parseSubjectImageAnalysis(value: unknown) {
  const result = subjectImageAnalysisSchema.safeParse(value);
  return result.success ? result.data : null;
}
