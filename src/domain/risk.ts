export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const keywords: Record<RiskLevel, string[]> = {
  CRITICAL: ["menor", "niño", "niña", "víctima", "victima", "suicidio", "abuso sexual", "crisis", "persona vulnerable"],
  HIGH: ["elección", "eleccion", "candidato", "congreso", "gobierno", "presupuesto", "acusación", "acusacion", "captura", "homicidio", "salud", "vacuna", "economía", "economia"],
  MEDIUM: ["rumor", "controversia", "viral", "tendencia", "espectáculo", "espectaculo", "opinión", "opinion"],
  LOW: ["turismo", "cultura", "agenda", "tradición", "tradicion", "comunidad", "servicio", "efeméride", "efemeride"],
};

const rank: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
export function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel { return rank[a] >= rank[b] ? a : b; }

export function classifyEditorialRisk(input: { title: string; body?: string; suggested?: RiskLevel }) {
  const text = `${input.title} ${input.body ?? ""}`.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
  const paddedText = ` ${text} `;
  const words = new Set(text.split(/\s+/).filter(Boolean));
  let deterministic: RiskLevel = "LOW";
  const matched: string[] = [];
  for (const level of ["MEDIUM", "HIGH", "CRITICAL"] as RiskLevel[]) {
    for (const keyword of keywords[level]) {
      const normalizedKeyword = keyword.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
      const matches = normalizedKeyword.includes(" ") ? paddedText.includes(` ${normalizedKeyword} `) : words.has(normalizedKeyword);
      if (matches) { deterministic = maxRisk(deterministic, level); matched.push(keyword); }
    }
  }
  const final = input.suggested ? maxRisk(deterministic, input.suggested) : deterministic;
  return { level: final, deterministicLevel: deterministic, matchedRules: matched, explanation: matched.length ? `Reglas activadas: ${matched.join(", ")}.` : "No se detectaron señales sensibles; requiere revisión humana antes del cierre." };
}
