import { Agent, Runner } from "@openai/agents";
import { agentWorkflowOutputSchema, assertNoInventedFacts, contentVariantSchema, investigationOutputSchema, variantsOutputSchema } from "@/src/domain/schemas";
import { claudeMessagesEndpoint } from "@/src/services/subject-image-analysis";
import type { z } from "zod";

export type InvestigationOutput = z.infer<typeof investigationOutputSchema>;
export type VariantOutput = z.infer<typeof contentVariantSchema>;
export type EditorialAgentInput = { title: string; description?: string; sources: Array<{ id: string; title: string; url: string; domain: string; excerpt: string; isPrimary: boolean }>; profiles: Array<{ slug: string; focus: string[]; tone: string[]; limits: string[] }> };
export type EditorialAgentResult = { investigation: InvestigationOutput; variants: VariantOutput[]; model: string; durationMs: number; usage?: { inputTokens?: number; outputTokens?: number } };
export type EditorialAgentStage = "investigation" | "variants" | `variant:${VariantOutput["outletSlug"]}`;

export interface OpenAIAdapter { runEditorialWorkflow(input: EditorialAgentInput, onStage?: (stage: EditorialAgentStage) => void | Promise<void>): Promise<EditorialAgentResult>; }

export class MockOpenAIAdapter implements OpenAIAdapter {
  async runEditorialWorkflow(input: EditorialAgentInput): Promise<EditorialAgentResult> {
    const started = Date.now();
    const sources = input.sources.length ? input.sources : [{ id: "source-demo", title: "Fuente de demostración", url: "https://example.com/demo", domain: "example.com", excerpt: input.description ?? input.title, isPrimary: true }];
    const facts = sources.slice(0, 3).map((source, index) => ({ id: `fact-${index + 1}`, claim: source.excerpt || `${input.title}: dato pendiente de verificación`, sourceIds: [source.id], confidence: source.isPrimary ? 92 : 78 }));
    const investigation: InvestigationOutput = { summary: `Expediente de demostración sobre ${input.title}.`, mainQuestion: `¿Qué está confirmado sobre ${input.title}?`, confirmedFacts: facts, unconfirmedClaims: [], contradictions: [], relevantDates: [], people: [], organizations: [], places: ["Guatemala"], figures: [], editorialRisks: ["Verificar vigencia antes de aprobación"], confidence: sources.length >= 2 ? 88 : 64, verdict: sources.length >= 2 && sources.some((source) => source.isPrimary) ? "CONFIRMED" : "INCOMPLETE", opinion: sources.length >= 2 ? "El núcleo factual es utilizable con revisión editorial." : "Se necesita otra fuente independiente antes de describir el contenido como confirmado." };
    const profiles = new Map(input.profiles.map((profile) => [profile.slug, profile]));
    const variants: VariantOutput[] = [
      { outletSlug: "insonimio-guatemala", headline: `Esto es lo que está generando conversación sobre ${input.title}`, hook: "La conversación crece, pero conviene separar lo confirmado de las reacciones.", angle: "Tendencia y conversación digital", socialCaption: `${input.title}: reunimos lo confirmado y lo que todavía debe tomarse con cautela.`, body: `${facts.map((fact) => fact.claim).join(" ")} Este borrador conserva el nivel de certeza del expediente.`, recommendedFormat: "Carrusel", callToAction: "¿Qué opinas? Participa con respeto.", sourceIds: [...new Set(facts.flatMap((fact) => fact.sourceIds))], factIds: facts.map((fact) => fact.id), confidence: investigation.confidence, suggestedRisk: "MEDIUM", warnings: profiles.get("insonimio-guatemala")?.limits.slice(0, 2) ?? [], reviewClaims: [] },
      { outletSlug: "yo-amo-guate", headline: `${input.title}: una mirada útil desde Guatemala`, hook: "La historia conecta información verificada con su valor para las comunidades.", angle: "Identidad, cultura y utilidad local", socialCaption: `Conoce los datos confirmados sobre ${input.title} y por qué pueden ser relevantes para Guatemala.`, body: `${facts.map((fact) => fact.claim).join(" ")} El enfoque mantiene el contexto y evita ocultar hechos relevantes.`, recommendedFormat: "Post de imagen", callToAction: "Comparte información verificada con tu comunidad.", sourceIds: [...new Set(facts.flatMap((fact) => fact.sourceIds))], factIds: facts.map((fact) => fact.id), confidence: investigation.confidence, suggestedRisk: "LOW", warnings: profiles.get("yo-amo-guate")?.limits.slice(0, 2) ?? [], reviewClaims: [] },
      { outletSlug: "trece-noticias", headline: `${input.title}: hechos, fuentes y contexto`, hook: "Estas son las claves confirmadas y los puntos que aún requieren seguimiento.", angle: "Actualidad y servicio público", socialCaption: `${input.title}: consulte los hechos respaldados, las fuentes y el nivel de certeza del expediente.`, body: `${facts.map((fact) => fact.claim).join(" ")} La redacción atribuye la información y mantiene visibles las limitaciones de la investigación.`, recommendedFormat: "Nota web", callToAction: "Consulte las fuentes y siga las actualizaciones verificadas.", sourceIds: [...new Set(facts.flatMap((fact) => fact.sourceIds))], factIds: facts.map((fact) => fact.id), confidence: investigation.confidence, suggestedRisk: "HIGH", warnings: profiles.get("trece-noticias")?.limits.slice(0, 2) ?? [], reviewClaims: investigation.verdict === "INCOMPLETE" ? ["No describir como confirmado"] : [] },
      { outletSlug: "tv-azteca-guate", headline: `${input.title}: las claves en imágenes y contexto`, hook: "Un recorrido ágil por lo confirmado, lo que falta por aclarar y por qué importa.", angle: "Explicación audiovisual de actualidad", socialCaption: `${input.title}: te explicamos las claves verificadas y los puntos que siguen bajo revisión.`, body: `${facts.map((fact) => fact.claim).join(" ")} El guion propone apoyos visuales atribuidos y conserva las advertencias del expediente.`, recommendedFormat: "Video explicativo", callToAction: "Sigue la cobertura y consulta las fuentes verificadas.", sourceIds: [...new Set(facts.flatMap((fact) => fact.sourceIds))], factIds: facts.map((fact) => fact.id), confidence: investigation.confidence, suggestedRisk: "MEDIUM", warnings: profiles.get("tv-azteca-guate")?.limits.slice(0, 2) ?? [], reviewClaims: investigation.verdict === "INCOMPLETE" ? ["Rotular los datos pendientes de confirmación"] : [] },
    ];
    assertNoInventedFacts(variants, facts);
    return { investigation, variants, model: "mock-deterministic-v1", durationMs: Date.now() - started };
  }
}

export class RealOpenAIAgentsAdapter implements OpenAIAdapter {
  async runEditorialWorkflow(input: EditorialAgentInput): Promise<EditorialAgentResult> {
    const started = Date.now(); const model = process.env.OPENAI_MODEL ?? "gpt-5.4";
    const researchAgent = new Agent({ name: "Especialista de investigación", model, instructions: "Investiga únicamente el expediente recibido. Distingue hechos, afirmaciones no confirmadas y contradicciones. Nunca inventes información. Cada hecho debe citar sourceIds existentes.", outputType: agentWorkflowOutputSchema.shape.investigation });
    const adaptationAgent = new Agent({ name: "Especialista de adaptación editorial", model, instructions: "Crea exactamente cuatro versiones diferenciadas para los perfiles indicados. Usa únicamente factIds y sourceIds del expediente. Conserva cifras, nombres, fechas, lugares y certeza.", outputType: agentWorkflowOutputSchema.pick({ variants: true }) });
    const orchestrator = new Agent({ name: "Orquestador editorial supervisado", model, instructions: "Coordina primero la investigación y después la adaptación editorial. Detén el flujo si la evidencia no es utilizable. Devuelve la salida estructurada solicitada y nunca publiques contenido.", tools: [researchAgent.asTool({ toolName: "investigar_expediente", toolDescription: "Produce un dictamen factual con evidencias." }), adaptationAgent.asTool({ toolName: "crear_versiones_editoriales", toolDescription: "Crea las cuatro adaptaciones sin añadir hechos." })], outputType: agentWorkflowOutputSchema });
    const runner = new Runner({ workflowName: "Nexo editorial", traceIncludeSensitiveData: false });
    const result = await runner.run(orchestrator, JSON.stringify(input), { maxTurns: 8 });
    const output = agentWorkflowOutputSchema.parse(result.finalOutput);
    assertNoInventedFacts(output.variants, output.investigation.confirmedFacts);
    const usage = result.state.usage;
    return { ...output, model, durationMs: Date.now() - started, usage };
  }
}

function extractJson(value: string) {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? value.slice(value.indexOf("{"), value.lastIndexOf("}") + 1);
  return JSON.parse(candidate) as Record<string, unknown>;
}

function normalizeInvestigation(value: Record<string, unknown>) {
  value.confidence = Math.round(Number(value.confidence ?? 0));
  const facts = Array.isArray(value.confirmedFacts) ? value.confirmedFacts as Array<Record<string, unknown>> : [];
  for (const fact of facts) fact.confidence = Math.round(Number(fact.confidence ?? 0));
  return value;
}

function normalizeVariant(value: Record<string, unknown>, fallbackConfidence: number) {
  const confidence = Number(value.confidence);
  value.confidence = Number.isFinite(confidence) ? Math.round(confidence) : fallbackConfidence;
  return value;
}

export class RealClaudeEditorialAdapter implements OpenAIAdapter {
  async runEditorialWorkflow(input: EditorialAgentInput, onStage?: (stage: EditorialAgentStage) => void | Promise<void>): Promise<EditorialAgentResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY para ejecutar el equipo editorial.");
    const started = Date.now();
    const configuredModel = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
    const model = process.env.ANTHROPIC_EDITORIAL_MODEL ?? (configuredModel.startsWith("nghi/") ? "nghi/claude-sonnet-4.6" : configuredModel);
    const sourceIds = input.sources.map((source) => source.id);
    const fallbackSourceId = sourceIds[0] ?? "manual-signal";
    const askClaude = async <T>(prompt: string, maxTokens: number, parse: (value: Record<string, unknown>) => T) => {
      let repair = "";
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const response = await fetch(claudeMessagesEndpoint(process.env.ANTHROPIC_BASE_URL), {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model, max_tokens: maxTokens, thinking: { type: "disabled" }, system: "Eres parte de Nexo, un equipo editorial supervisado. Usa únicamente el expediente recibido. No agregues hechos, fechas, cifras, lugares, citas ni identidades ausentes. Devuelve exclusivamente JSON válido, sin markdown.", messages: [{ role: "user", content: [{ type: "text", text: `${prompt}${repair}` }] }] }),
          cache: "no-store",
        });
        if (!response.ok) { const body = await response.text(); let detail = `Claude API respondió ${response.status}`; try { const parsed = JSON.parse(body) as { error?: { message?: string } }; if (parsed.error?.message) detail += `: ${parsed.error.message}`; } catch {} throw new Error(detail); }
        const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
        const text = data.content?.filter((item) => item.type === "text").map((item) => item.text ?? "").join("\n").trim();
        if (!text) throw new Error(`Claude agotó la respuesta antes de entregar texto (${data.content?.map((item) => item.type).join(", ") || "sin bloques"}).`);
        try { return parse(extractJson(text)); }
        catch (error) { if (attempt === 2) throw error; repair = `\n\nCORRIGE EL JSON COMPLETO. Error de esquema: ${error instanceof Error ? error.message.slice(0, 700) : "salida inválida"}. Sé más breve.`; }
      }
      throw new Error("Claude no devolvió una salida editorial válida.");
    };

    await onStage?.("investigation");
    const investigation = await askClaude(
      `INVESTIGA ESTE EXPEDIENTE:\n${JSON.stringify({ title: input.title, description: input.description, sources: input.sources, fallbackSourceId })}\n\nDevuelve {"summary":"","mainQuestion":"","confirmedFacts":[{"id":"fact-1","claim":"","sourceIds":["${fallbackSourceId}"],"confidence":0}],"unconfirmedClaims":[],"contradictions":[],"relevantDates":[],"people":[],"organizations":[],"places":[],"figures":[],"editorialRisks":[],"confidence":0,"verdict":"INCOMPLETE","opinion":""}. Usa sólo sourceIds disponibles (${sourceIds.join(", ") || fallbackSourceId}). Si una fuente reproduce una declaración, el hecho confirmado es que la fuente la atribuye, no que la declaración sea verdadera.`,
      3500,
      (value) => investigationOutputSchema.parse(normalizeInvestigation(value)),
    );
    await onStage?.("variants");
    const profileBySlug = new Map(input.profiles.map((profile) => [profile.slug, profile]));
    const outlets: VariantOutput["outletSlug"][] = ["insonimio-guatemala", "yo-amo-guate", "trece-noticias", "tv-azteca-guate"];
    const variants: VariantOutput[] = [];
    for (const outletSlug of outlets) {
      await onStage?.(`variant:${outletSlug}`);
      const variant = await askClaude(
        `CREA UN SOLO BORRADOR PARA ${outletSlug.toUpperCase()} A PARTIR DE ESTE NÚCLEO:\n${JSON.stringify({ title: input.title, investigation, profile: profileBySlug.get(outletSlug) })}\n\nDevuelve directamente un objeto con outletSlug (debe ser "${outletSlug}"), headline, hook, angle, socialCaption, body, recommendedFormat, callToAction, sourceIds, factIds, confidence, suggestedRisk, warnings y reviewClaims. recommendedFormat sólo puede ser: Post de imagen, Carrusel, Nota web, Reel, Historia o Video explicativo. Limita body a 110 palabras. Usa únicamente los sourceIds y factIds de la investigación. Si la evidencia es limitada, rotula la pieza como borrador no publicable y añade la advertencia. Para Insomnio Guatemala prioriza Post de imagen o Carrusel y una dirección visual factual; para Trece Noticias prioriza Nota web; para TV Azteca Guate prioriza Video explicativo o Reel.`,
        2600,
        (value) => contentVariantSchema.parse(normalizeVariant(value, investigation.confidence)),
      );
      variants.push(variant);
    }
    variantsOutputSchema.parse({ variants });
    assertNoInventedFacts(variants, investigation.confirmedFacts);
    return { investigation, variants, model, durationMs: Date.now() - started };
  }
}

export function editorialAiProvider() {
  if (process.env.DEMO_MODE !== "false") return "demo" as const;
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_ENABLED === "true") return "claude" as const;
  if (process.env.OPENAI_API_KEY) return "openai" as const;
  return "demo" as const;
}

export function createOpenAIAdapter(): OpenAIAdapter {
  const provider = editorialAiProvider();
  if (provider === "claude") return new RealClaudeEditorialAdapter();
  if (provider === "openai") return new RealOpenAIAgentsAdapter();
  return new MockOpenAIAdapter();
}
