import { z } from "zod";

export const sourceSchema = z.object({ id: z.string(), title: z.string().min(1), url: z.url(), domain: z.string().min(1), excerpt: z.string().min(1), confidence: z.number().int().min(0).max(100), isPrimary: z.boolean() });
export const factSchema = z.object({ id: z.string(), claim: z.string().min(1), sourceIds: z.array(z.string()).min(1), confidence: z.number().int().min(0).max(100) });
export const investigationOutputSchema = z.object({ summary: z.string().min(1), mainQuestion: z.string().min(1), confirmedFacts: z.array(factSchema), unconfirmedClaims: z.array(z.string()), contradictions: z.array(z.object({ description: z.string(), sourceIds: z.array(z.string()), severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]) })), relevantDates: z.array(z.string()), people: z.array(z.string()), organizations: z.array(z.string()), places: z.array(z.string()), figures: z.array(z.string()), editorialRisks: z.array(z.string()), confidence: z.number().int().min(0).max(100), verdict: z.enum(["CONFIRMED", "PARTIALLY_CONFIRMED", "INCOMPLETE", "DOUBTFUL", "NOT_PUBLISHABLE"]), opinion: z.string() });
export const contentVariantSchema = z.object({ outletSlug: z.enum(["insonimio-guatemala", "yo-amo-guate", "trece-noticias", "tv-azteca-guate"]), headline: z.string().min(5), hook: z.string().min(5), angle: z.string().min(5), socialCaption: z.string().min(5), body: z.string().min(10), recommendedFormat: z.enum(["Post de imagen", "Carrusel", "Nota web", "Reel", "Historia", "Video explicativo"]), callToAction: z.string(), sourceIds: z.array(z.string()).min(1), factIds: z.array(z.string()).min(1), confidence: z.number().int().min(0).max(100), suggestedRisk: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), warnings: z.array(z.string()), reviewClaims: z.array(z.string()) });
export const variantsOutputSchema = z.object({ variants: z.array(contentVariantSchema).length(4) }).superRefine((value, context) => { const outlets = new Set(value.variants.map((variant) => variant.outletSlug)); if (outlets.size !== 4) context.addIssue({ code: "custom", message: "Debe existir una versión por cada uno de los cuatro medios." }); });
export const agentWorkflowOutputSchema = z.object({ investigation: investigationOutputSchema, variants: variantsOutputSchema.shape.variants });

export function assertNoInventedFacts(variants: z.infer<typeof contentVariantSchema>[], facts: z.infer<typeof factSchema>[]) {
  const allowedFacts = new Set(facts.map((fact) => fact.id));
  for (const variant of variants) for (const factId of variant.factIds) if (!allowedFacts.has(factId)) throw new Error(`La versión ${variant.outletSlug} referencia un hecho inexistente: ${factId}`);
}

export async function parseWithRepair<T>(schema: z.ZodType<T>, value: unknown, repair: (issues: string[]) => Promise<unknown>, maxRetries = 1): Promise<T> {
  let candidate = value; let attempt = 0;
  while (true) { const parsed = schema.safeParse(candidate); if (parsed.success) return parsed.data; if (attempt >= maxRetries) throw new Error(`Salida estructurada inválida: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`); candidate = await repair(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)); attempt += 1; }
}
