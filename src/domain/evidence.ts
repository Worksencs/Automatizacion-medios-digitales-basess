export type EvidenceSource = { id: string; domain: string; isPrimary: boolean; accessible?: boolean };
export function evaluateEvidence(sources: EvidenceSource[], confirmedFacts: number) {
  const accessible = sources.filter((source) => source.accessible !== false);
  const independentDomains = new Set(accessible.map((source) => source.domain.toLowerCase()));
  const hasPrimary = accessible.some((source) => source.isPrimary);
  const hasTwoIndependent = independentDomains.size >= 2;
  const ready = confirmedFacts > 0 && hasTwoIndependent && hasPrimary;
  return {
    ready, hasPrimary, hasTwoIndependent, confirmedFacts,
    verdict: ready ? "CONFIRMED" as const : confirmedFacts > 0 ? "INCOMPLETE" as const : "DOUBTFUL" as const,
    reasons: [!hasPrimary && "No se encontró una fuente primaria accesible.", !hasTwoIndependent && "Se requieren al menos dos fuentes independientes.", confirmedFacts === 0 && "No hay hechos confirmados respaldados."].filter(Boolean) as string[],
  };
}
