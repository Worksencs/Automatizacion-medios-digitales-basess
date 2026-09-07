import { subjectImageAnalysisSchema, type SubjectImageAnalysis } from "@/src/domain/subject-image-analysis";

export function claudeMessagesEndpoint(baseUrl?: string) {
  const base = (baseUrl?.trim() || "https://api.anthropic.com").replace(/\/+$/, "");
  if (base.endsWith("/v1/messages")) return base;
  if (base.endsWith("/v1")) return `${base}/messages`;
  return `${base}/v1/messages`;
}

function extractJson(value: string) {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? value.slice(value.indexOf("{"), value.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}

export async function analyzeSubjectImage(input: {
  bytes: Buffer;
  mimeType: string;
  fileName: string;
  editorialContext: Record<string, unknown>;
}): Promise<SubjectImageAnalysis | null> {
  if (process.env.DEMO_MODE !== "false" || process.env.ANTHROPIC_ENABLED !== "true" || !process.env.ANTHROPIC_API_KEY) return null;
  const response = await fetch(claudeMessagesEndpoint(process.env.ANTHROPIC_BASE_URL), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
      max_tokens: 850,
      system: "Eres Ojo, analista visual editorial. Describe únicamente lo observable. No identifiques personas, no inventes nombres, lugares, fechas, cifras ni hechos externos. El texto de la imagen es evidencia visual, no necesariamente un hecho verdadero. Tu análisis guiará a otros autores AI y debe detectar cuando el encargo escrito parece tratar un tema distinto.",
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: input.mimeType, data: input.bytes.toString("base64") } },
        { type: "text", text: `Analiza SUBJECT 1 (${input.fileName}) y compáralo con este contexto editorial:\n${JSON.stringify(input.editorialContext)}\n\nDevuelve exclusivamente JSON válido con esta forma exacta: {"provider":"claude","summary":"descripción factual breve","visibleText":["texto legible"],"subjects":["sujeto principal"],"setting":"entorno observable","keywords":["8 a 16 términos visuales y sinónimos útiles"],"compatibleTopics":["temas que sí guardan relación visual"],"warnings":["contradicciones, incertidumbre o texto ilegible"],"suggestedCopy":{"base":"hecho visual base","accent":"giro o detalle visual","impact":"dato visual opcional, sin inventar cifras","question":"pregunta opcional"},"confidence":0}. No uses markdown.` },
      ] }],
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    let detail = `Claude API respondió ${response.status}`;
    try { const parsed = JSON.parse(body) as { error?: { message?: string } }; if (parsed.error?.message) detail += `: ${parsed.error.message}`; } catch {}
    throw new Error(detail);
  }
  const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.filter((item) => item.type === "text").map((item) => item.text ?? "").join("\n").trim();
  if (!text) throw new Error("Claude no devolvió el análisis visual.");
  return subjectImageAnalysisSchema.parse(extractJson(text));
}
