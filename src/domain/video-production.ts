import type { RoleCode } from "./permissions";

export type VideoStageCode = "BRIEF" | "FACT_CHECK" | "SCRIPT" | "VISUAL_PLAN" | "PRODUCTION" | "EDITING" | "EDITORIAL_REVIEW" | "DIRECTION_REVIEW" | "COMPLETE";
export type VideoTaskStatusCode = "PENDING" | "IN_PROGRESS" | "BLOCKED" | "DONE";
export type ProductionOutputKind = "AUDIOVISUAL" | "EDITORIAL_DOCUMENT" | "SOCIAL_CARD";
export type ProductionDefaults = {
  outputKind: ProductionOutputKind;
  productType: string;
  primaryPlatform: string;
  aspectRatio?: "16:9" | "9:16" | "4:5" | "1:1";
  durationSeconds?: number;
  pageSize?: "Carta" | "A4";
  documentStyle?: "Nota informativa" | "Reportaje" | "Boletín" | "Informe editorial";
};

export const aiAgentTeam = [
  { key: "nexo_brief", name: "Alba", role: "Productora editorial AI", initials: "AL" },
  { key: "nexo_verify", name: "Certeza", role: "Verificación AI", initials: "CE" },
  { key: "nexo_script", name: "Tinta", role: "Redacción y guion AI", initials: "TI" },
  { key: "nexo_visual", name: "Plano", role: "Diseño y estructura AI", initials: "PL" },
  { key: "nexo_designer", name: "Lumen", role: "Diseño gráfico AI", initials: "LU" },
  { key: "nexo_production", name: "Pulso", role: "Producción de contenidos AI", initials: "PU" },
  { key: "nexo_edit", name: "Corte", role: "Edición y formato AI", initials: "CO" },
  { key: "nexo_review", name: "Faro", role: "Control editorial AI", initials: "FA" },
  { key: "nexo_director", name: "Norte", role: "Dirección AI", initials: "NO" },
] as const;

export const videoTaskBlueprints: Array<{ order: number; title: string; description: string; stage: VideoStageCode; assignedRole: RoleCode; agentKey: string; agentName: string }> = [
  { order: 1, title: "Convertir el encargo en brief", description: "Fija producto, objetivo, audiencia, duración, canal y criterio de salida.", stage: "BRIEF", assignedRole: "REPORTERO", agentKey: "nexo_brief", agentName: "Alba" },
  { order: 2, title: "Verificar hechos y material", description: "Confirma fuentes, derechos y que cada afirmación conserve su nivel de certeza.", stage: "FACT_CHECK", assignedRole: "REPORTERO", agentKey: "nexo_verify", agentName: "Certeza" },
  { order: 3, title: "Construir el guion", description: "Adapta el guion al tono y límites del medio sin cambiar el núcleo factual.", stage: "SCRIPT", assignedRole: "EDITOR_MARCA", agentKey: "nexo_script", agentName: "Tinta" },
  { order: 4, title: "Diseñar el plan visual", description: "Define tomas, placas, recursos, créditos y advertencias necesarias.", stage: "VISUAL_PLAN", assignedRole: "EDITOR_MARCA", agentKey: "nexo_visual", agentName: "Plano" },
  { order: 5, title: "Construir el sistema gráfico", description: "El diseñador AI convierte la dirección visual en composición, tipografía, color y reglas de uso de imagen.", stage: "VISUAL_PLAN", assignedRole: "EDITOR_MARCA", agentKey: "nexo_designer", agentName: "Lumen" },
  { order: 6, title: "Preparar la producción", description: "Documenta locución, grabación y recursos que necesita la pieza.", stage: "PRODUCTION", assignedRole: "REPORTERO", agentKey: "nexo_production", agentName: "Pulso" },
  { order: 7, title: "Armar la edición", description: "Produce la pauta de montaje, ritmo, rótulos, audio y exportación.", stage: "EDITING", assignedRole: "EDITOR_MARCA", agentKey: "nexo_edit", agentName: "Corte" },
  { order: 8, title: "Revisar calidad editorial", description: "Valida precisión, contexto, riesgos y cumplimiento antes de elevar a Dirección.", stage: "EDITORIAL_REVIEW", assignedRole: "EDITOR_SENIOR", agentKey: "nexo_review", agentName: "Faro" },
  { order: 9, title: "Preparar recomendación final", description: "Dirección AI consolida el paquete, pero no sustituye la decisión del administrador.", stage: "DIRECTION_REVIEW", assignedRole: "DIRECCION", agentKey: "nexo_director", agentName: "Norte" },
];

export const documentTaskBlueprints: typeof videoTaskBlueprints = [
  { order: 1, title: "Definir el encargo editorial", description: "Fija producto, objetivo, audiencia, extensión, tono y criterio de salida del documento.", stage: "BRIEF", assignedRole: "REPORTERO", agentKey: "nexo_brief", agentName: "Alba" },
  { order: 2, title: "Verificar hechos y fuentes", description: "Contrasta las afirmaciones, conserva atribuciones y señala cualquier dato pendiente.", stage: "FACT_CHECK", assignedRole: "REPORTERO", agentKey: "nexo_verify", agentName: "Certeza" },
  { order: 3, title: "Redactar la pieza periodística", description: "Construye titular, entradilla y cuerpo con el tono del medio y el nivel de certeza disponible.", stage: "SCRIPT", assignedRole: "EDITOR_MARCA", agentKey: "nexo_script", agentName: "Tinta" },
  { order: 4, title: "Diseñar estructura y jerarquía", description: "Ordena secciones, destacados, apoyos y lectura visual para la versión PDF.", stage: "VISUAL_PLAN", assignedRole: "EDITOR_MARCA", agentKey: "nexo_visual", agentName: "Plano" },
  { order: 5, title: "Diseñar el sistema editorial", description: "El diseñador AI define tipografía, retícula, color y tratamiento visual del documento.", stage: "VISUAL_PLAN", assignedRole: "EDITOR_MARCA", agentKey: "nexo_designer", agentName: "Lumen" },
  { order: 6, title: "Preparar recursos editoriales", description: "Organiza sumarios, créditos, recuadros y referencias que acompañan la redacción.", stage: "PRODUCTION", assignedRole: "REPORTERO", agentKey: "nexo_production", agentName: "Pulso" },
  { order: 7, title: "Editar y maquetar el documento", description: "Depura estilo y prepara una salida PDF legible, consistente y lista para revisión.", stage: "EDITING", assignedRole: "EDITOR_MARCA", agentKey: "nexo_edit", agentName: "Corte" },
  { order: 8, title: "Revisar calidad editorial", description: "Valida precisión, contexto, riesgos, estructura y cumplimiento antes de elevar a Dirección.", stage: "EDITORIAL_REVIEW", assignedRole: "EDITOR_SENIOR", agentKey: "nexo_review", agentName: "Faro" },
  { order: 9, title: "Preparar recomendación final", description: "Dirección AI consolida el PDF, pero no sustituye la aprobación del administrador.", stage: "DIRECTION_REVIEW", assignedRole: "DIRECCION", agentKey: "nexo_director", agentName: "Norte" },
];

export const socialCardTaskBlueprints: typeof videoTaskBlueprints = [
  { order: 1, title: "Definir la tarjeta informativa", description: "Cruza la lectura visual de la imagen con el encargo y fija mensaje, audiencia, plataforma, formato y criterio de salida.", stage: "BRIEF", assignedRole: "REPORTERO", agentKey: "nexo_brief", agentName: "Alba" },
  { order: 2, title: "Verificar titular e imágenes", description: "Contrasta lo escrito con lo observable, separa evidencia visual de hechos externos y conserva créditos y nivel de certeza.", stage: "FACT_CHECK", assignedRole: "REPORTERO", agentKey: "nexo_verify", agentName: "Certeza" },
  { order: 3, title: "Escribir el texto para redes", description: "Produce un titular y una bajada guiados por el sujeto, el entorno y el texto visible de la imagen, sin inventar contexto.", stage: "SCRIPT", assignedRole: "EDITOR_MARCA", agentKey: "nexo_script", agentName: "Tinta" },
  { order: 4, title: "Diseñar la composición visual", description: "Define retícula, jerarquía, contraste, áreas de imagen, marca y zonas seguras.", stage: "VISUAL_PLAN", assignedRole: "EDITOR_MARCA", agentKey: "nexo_visual", agentName: "Plano" },
  { order: 5, title: "Diseñar el arte final", description: "El diseñador AI aplica la plantilla de marca, la imagen original, la jerarquía tipográfica y el sistema de color sin alterar el material autorizado.", stage: "VISUAL_PLAN", assignedRole: "EDITOR_MARCA", agentKey: "nexo_designer", agentName: "Lumen" },
  { order: 6, title: "Preparar recursos gráficos", description: "Organiza fotografías autorizadas, créditos, rótulos y elementos de identidad necesarios.", stage: "PRODUCTION", assignedRole: "REPORTERO", agentKey: "nexo_production", agentName: "Pulso" },
  { order: 7, title: "Maquetar la tarjeta en HTML", description: "Convierte el diseño en HTML y CSS responsive, editable y listo para exportar como imagen.", stage: "EDITING", assignedRole: "EDITOR_MARCA", agentKey: "nexo_edit", agentName: "Corte" },
  { order: 8, title: "Revisar legibilidad y riesgos", description: "Valida contraste, ortografía, atribuciones, recorte y seguridad editorial antes de Dirección.", stage: "EDITORIAL_REVIEW", assignedRole: "EDITOR_SENIOR", agentKey: "nexo_review", agentName: "Faro" },
  { order: 9, title: "Preparar recomendación final", description: "Dirección AI consolida la tarjeta HTML, pero no sustituye la aprobación del administrador.", stage: "DIRECTION_REVIEW", assignedRole: "DIRECCION", agentKey: "nexo_director", agentName: "Norte" },
];

export function getProductionTaskBlueprints(outputKind: ProductionOutputKind) {
  if (outputKind === "EDITORIAL_DOCUMENT") return documentTaskBlueprints;
  if (outputKind === "SOCIAL_CARD") return socialCardTaskBlueprints;
  return videoTaskBlueprints;
}

export function productionDefaultsForFormat(format: string): ProductionDefaults {
  if (format === "Nota web") return { outputKind: "EDITORIAL_DOCUMENT", productType: "Nota periodística", primaryPlatform: "Documento PDF", pageSize: "Carta", documentStyle: "Nota informativa" };
  if (["Post de imagen", "Carrusel"].includes(format)) return { outputKind: "SOCIAL_CARD", productType: format === "Carrusel" ? "Comparativa visual" : "Tarjeta informativa", primaryPlatform: "Instagram Feed", aspectRatio: "4:5" };
  if (["Reel", "Historia"].includes(format)) return { outputKind: "AUDIOVISUAL", productType: format === "Reel" ? "Reel / Short vertical" : "Historia vertical", primaryPlatform: "Instagram Story / Reel", aspectRatio: "9:16", durationSeconds: 60 };
  return { outputKind: "AUDIOVISUAL", productType: "Video explicativo de servicio", primaryPlatform: "TV / YouTube", aspectRatio: "16:9", durationSeconds: 60 };
}

// Every author starts from the same locked brief, source dossier and SUBJECT 1.
// There are no sequential hand-offs inside an AI production run.
export const videoAgentPhases = [[1, 2, 3, 4, 5, 6, 7, 8, 9]] as const;

export function isProductionBriefReady(input: { outputKind?: string | null; productType?: string | null; objective?: string | null; audience?: string | null; durationSeconds?: number | null; primaryPlatform?: string | null; cardBaseText?: string | null; cardAccentText?: string | null; subjectImagePath?: string | null; productionNotes?: string | null }) {
  const requestIsClear = (input.productionNotes?.trim().length ?? 0) >= 10;
  const common = Boolean(requestIsClear && input.productType?.trim() && input.objective?.trim() && input.audience?.trim() && input.primaryPlatform?.trim() && input.subjectImagePath?.trim());
  if (input.outputKind === "EDITORIAL_DOCUMENT") return common && input.primaryPlatform === "Documento PDF";
  if (input.outputKind === "SOCIAL_CARD") return common && input.primaryPlatform !== "Documento PDF";
  return common && Boolean(input.durationSeconds && input.durationSeconds > 0);
}

export function canContributeToVideo(role: RoleCode) {
  return ["ADMIN", "DIRECCION", "EDITOR_SENIOR", "EDITOR_MARCA", "REPORTERO"].includes(role);
}

export function canUpdateVideoTask(input: { role: RoleCode; assignedRole: string; userId: string; assigneeId?: string | null }) {
  return input.role === "ADMIN" || input.role === "DIRECCION" || input.role === "EDITOR_SENIOR" || input.role === input.assignedRole || input.userId === input.assigneeId;
}

export function requireCompletionEvidence(status: VideoTaskStatusCode, deliverable: string | undefined, evidenceCount: number) {
  if (status === "DONE" && !deliverable?.trim() && evidenceCount === 0) throw new Error("Para completar la tarea debes registrar un entregable o adjuntar evidencia.");
}

export function summarizeVideoProgress(tasks: Array<{ order: number; stage: VideoStageCode; status: VideoTaskStatusCode }>) {
  const ordered = [...tasks].sort((a, b) => a.order - b.order);
  const done = ordered.filter((task) => task.status === "DONE").length;
  const progress = ordered.length ? Math.round((done / ordered.length) * 100) : 0;
  const firstOpen = ordered.find((task) => task.status !== "DONE");
  const blocked = ordered.some((task) => task.status === "BLOCKED");
  const inReview = firstOpen && ["EDITORIAL_REVIEW", "DIRECTION_REVIEW"].includes(firstOpen.stage);
  return {
    progress,
    currentStage: firstOpen?.stage ?? "COMPLETE" as VideoStageCode,
    status: progress === 100 ? "READY" : blocked ? "BLOCKED" : inReview ? "IN_REVIEW" : done === 0 ? "PLANNING" : "IN_PROGRESS",
  } as const;
}

export const videoStageLabels: Record<VideoStageCode, string> = {
  BRIEF: "Brief", FACT_CHECK: "Verificación", SCRIPT: "Redacción / guion", VISUAL_PLAN: "Estructura visual", PRODUCTION: "Producción", EDITING: "Edición", EDITORIAL_REVIEW: "Revisión editorial", DIRECTION_REVIEW: "Dirección", COMPLETE: "Lista",
};
