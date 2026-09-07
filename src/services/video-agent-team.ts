import { Agent, Runner } from "@openai/agents";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/src/db";
import { aiAgentTeam, videoAgentPhases, type ProductionOutputKind } from "@/src/domain/video-production";
import { INSOMNIO_SOCIAL_MASTER_PROMPT, isInsomnioOutlet } from "@/src/domain/insomnio-social-template";
import { parseSubjectImageAnalysis, type SubjectImageAnalysis } from "@/src/domain/subject-image-analysis";
import { claudeMessagesEndpoint } from "@/src/services/subject-image-analysis";

export { claudeMessagesEndpoint } from "@/src/services/subject-image-analysis";

export type AgentStreamEvent = {
  id: string;
  agentKey: string;
  agentName: string;
  agentRole: string;
  action: string;
  detail: string;
  status: "SYSTEM" | "WORKING" | "HANDOFF" | "DONE" | "FAILED";
  progress: number;
  createdAt: string;
  taskId?: string;
  taskStatus?: "PENDING" | "IN_PROGRESS" | "BLOCKED" | "DONE";
  deliverable?: string;
  runStatus?: "IDLE" | "RUNNING" | "WAITING_ADMIN" | "COMPLETED" | "FAILED" | "PAUSED";
};

type ProductionContext = {
  projectId?: string;
  title: string;
  headline: string;
  hook: string;
  outlet: string;
  outputKind?: ProductionOutputKind;
  productType: string;
  objective: string;
  audience: string;
  durationSeconds: number;
  primaryPlatform: string;
  productionNotes?: string | null;
  aspectRatio?: string | null;
  resolution?: string | null;
  captionStyle?: string | null;
  voiceStyle?: string | null;
  pageSize?: string | null;
  documentStyle?: string | null;
  subjectImagePath?: string | null;
  subjectImageName?: string | null;
  subjectImageMime?: string | null;
  subjectImageAnalysis?: SubjectImageAnalysis | null;
  breakingBadge?: string | null;
  cardBaseText?: string | null;
  cardAccentText?: string | null;
  cardImpactText?: string | null;
  cardQuestion?: string | null;
  templateRules?: string | null;
  sourceCount: number;
  sources?: Array<{ title: string; url: string; domain: string; excerpt: string; isPrimary: boolean }>;
  editorialDraft?: string;
  editorialWarnings?: string[];
};

const roleByKey = new Map<string, string>(aiAgentTeam.map((agent) => [agent.key, agent.role]));
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function buildDemoDeliverable(order: number, context: ProductionContext) {
  if (context.outputKind === "SOCIAL_CARD") {
    const outputs: Record<number, string> = {
      1: `Encargo gráfico cerrado: ${context.productType} para ${context.audience}; formato ${context.aspectRatio ?? "1:1"}; plataforma ${context.primaryPlatform}; salida HTML editable y PNG bajo aprobación humana.`,
      2: `${context.sourceCount} fuentes del expediente revisadas. ${context.subjectImageAnalysis ? `La lectura visual identifica ${context.subjectImageAnalysis.subjects.join(", ")}; el texto debe conservar esa relación.` : "La imagen requiere lectura visual antes de cerrar el enfoque."} Las fotografías deben estar autorizadas y acreditadas.`,
      3: `Texto social preparado a partir del encargo y de la lectura visual: titular “${context.headline}” y bajada “${context.hook}”. Mantener lenguaje informativo, lectura rápida y el nivel de certeza visible.`,
      4: `Composición propuesta: dos áreas visuales comparadas, separador de color, marca superior y bloque inferior oscuro con titular jerarquizado en amarillo y blanco.`,
      5: `Arte final definido por Lumen: plantilla ${context.templateRules ? "Insomnio Guatemala 9:16" : "del medio"}, imagen principal ${context.subjectImagePath ? `adjunta como “${context.subjectImageName ?? "SUBJECT 1"}” y conservada sin alteraciones` : "pendiente"}, jerarquía factual y máximo seis líneas.`,
      6: `Paquete gráfico: fotografía principal autorizada, créditos, identificador del medio, rótulo de contexto y nota de revisión humana.`,
      7: `Tarjeta maquetada en HTML y CSS responsive, relación ${context.aspectRatio ?? "1:1"}, con texto editable y acción de exportación a PNG.`,
      8: `Control editorial: contraste, ortografía, zonas seguras, créditos y legibilidad móvil revisados. No reemplazar fotografías pendientes con material no verificado.`,
      9: `Recomendación de Dirección AI: tarjeta social HTML lista para revisión humana; no publicar ni exportar como pieza final sin aprobación del administrador.`,
    };
    return outputs[order] ?? "Entregable gráfico preparado por el equipo AI.";
  }
  if (context.outputKind === "EDITORIAL_DOCUMENT") {
    const outputs: Record<number, string> = {
      1: `Encargo editorial cerrado: ${context.productType} para ${context.audience}; objetivo: ${context.objective}; salida obligatoria: Documento PDF ${context.pageSize ?? "Carta"}.`,
      2: `${context.sourceCount} fuentes del expediente contrastadas. La redacción conservará atribuciones, nivel de certeza y aviso visible cuando el contenido sea ficticio o esté pendiente de confirmación.`,
      3: `Borrador periodístico: titular “${context.headline}”; entradilla basada en “${context.hook}”; cuerpo organizado en contexto, hechos verificados e implicaciones para la audiencia. Tono adaptado a ${context.outlet}.`,
      4: `Jerarquía para PDF: portada editorial, titular y bajada; cuerpo en secciones breves; recuadro de datos verificados; fuentes y advertencias al cierre.`,
      5: `Sistema editorial de Lumen: retícula, tipografía, escala, color y tratamiento de apoyos definidos para lectura consistente.`,
      6: `Recursos editoriales listos: sumario, destacado, créditos, referencias y nota metodológica. Ningún dato nuevo se incorpora sin respaldo del expediente.`,
      7: `Documento maquetado como ${context.documentStyle ?? "nota informativa"}, tamaño ${context.pageSize ?? "Carta"}: tipografía legible, márgenes consistentes, cabecera del medio, paginación y salida PDF.`,
      8: `Control editorial completado: precisión, contexto, atribuciones, jerarquía y legibilidad revisados. Mantener la advertencia de revisión humana antes de distribución.`,
      9: `Recomendación de Dirección AI: PDF editorial listo para revisión humana. Producto: ${context.productType}; no distribuir sin aprobación del administrador.`,
    };
    return outputs[order] ?? "Entregable editorial preparado por el equipo AI.";
  }
  const duration = `${context.durationSeconds} s`;
  const outputs: Record<number, string> = {
    1: `Brief cerrado: ${context.productType} de ${duration} para ${context.audience}; objetivo: ${context.objective}; salida: ${context.primaryPlatform}.`,
    2: `${context.sourceCount} fuentes del expediente contrastadas. Mantener atribución, certeza y aviso de contenido ficticio en rótulos y locución.`,
    3: `Guion ${duration}: apertura “${context.hook}”; desarrollo en tres bloques; cierre orientado a “${context.objective}”. Tono adaptado a ${context.outlet}.`,
    4: `Plan visual ${context.aspectRatio ?? "16:9"}: apertura con placa de servicio, mapa/recurso contextual, tres rótulos factuales, créditos de fuente y cierre con llamado a verificación.`,
    5: `Sistema gráfico de Lumen: estilo de placas, tipografía, paleta, rótulos y keyframes definidos para el montaje.`,
    6: `Paquete de producción: locución ${context.voiceStyle?.toLowerCase() ?? "informativa"}, captura de recursos autorizados, lista de rótulos, música licenciada y control de derechos antes del montaje.`,
    7: `Pauta de edición ${context.resolution ?? "1080p"} para ${context.primaryPlatform}: ritmo ágil, subtítulos ${context.captionStyle?.toLowerCase() ?? "informativos"}, mezcla de voz prioritaria y exportación maestra.`,
    8: `Control editorial: coherencia con el expediente aprobada. Condiciones: conservar atribuciones, no convertir supuestos en hechos y verificar créditos visuales.`,
    9: `Recomendación de Dirección AI: paquete listo para revisión humana. Producto: ${context.productType}; canal: ${context.primaryPlatform}; no publicar sin aprobación del administrador.`,
  };
  return outputs[order] ?? "Entregable preparado por el equipo AI.";
}

async function buildRealDeliverable(order: number, task: { title: string; description: string; agentName: string | null; agentKey: string | null }, context: ProductionContext) {
  const agent = new Agent({
    name: `${task.agentName ?? "Agente"} · ${roleByKey.get(task.agentKey ?? "") ?? "Producción AI"}`,
    model: process.env.OPENAI_MODEL ?? "gpt-5.4",
    instructions: `Eres un autor especializado dentro de una sala de producción editorial concurrente. Los nueve autores trabajan al mismo tiempo sobre el mismo brief, expediente de fuentes y SUBJECT 1; no esperas un traspaso de otro agente. Tu responsabilidad es: ${task.description} Trabaja sólo con el encargo, el borrador editorial, las fuentes registradas y la lectura visual compartida. La imagen es una fuente editorial: úsala para definir el sujeto y rechaza cualquier texto que contradiga lo observable. No conviertas lo visible en un hecho externo no verificado. Sé concreto, no inventes hechos ni imágenes, deja clara cualquier condición o bloqueo y nunca publiques ni apruebes por el humano. Devuelve un entregable profesional en español de Guatemala, máximo 140 palabras.`,
  });
  const runner = new Runner({ workflowName: "Nexo · Producción editorial", traceIncludeSensitiveData: false });
  const result = await runner.run(agent, JSON.stringify({ salaCompartida: context }), { maxTurns: 4 });
  return String(result.finalOutput ?? "El agente no devolvió contenido.");
}

async function buildClaudeDeliverable(task: { title: string; description: string; agentName: string | null; agentKey: string | null }, context: ProductionContext) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY para ejecutar Claude.");
  const endpoint = claudeMessagesEndpoint(process.env.ANTHROPIC_BASE_URL);
  const content: Array<Record<string, unknown>> = [{ type: "text", text: JSON.stringify({ tareaConcurrente: task.title, salaCompartida: context }) }];
  if (context.projectId && context.subjectImagePath && context.subjectImageMime && ["nexo_visual", "nexo_designer", "nexo_review"].includes(task.agentKey ?? "")) {
    const uploadRoot = path.resolve(process.cwd(), "public", "uploads", context.projectId);
    const imagePath = path.resolve(process.cwd(), "public", context.subjectImagePath.replace(/^\/+/, ""));
    if (imagePath.startsWith(`${uploadRoot}${path.sep}`)) {
      const data = await readFile(imagePath);
      content.push({ type: "image", source: { type: "base64", media_type: context.subjectImageMime, data: data.toString("base64") } });
    }
  }
  const requestBody = JSON.stringify({
    model: process.env.ANTHROPIC_PRODUCTION_MODEL ?? process.env.ANTHROPIC_EDITORIAL_MODEL ?? (process.env.ANTHROPIC_MODEL?.startsWith("nghi/") ? "nghi/claude-sonnet-4.6" : process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5"),
    max_tokens: 2200,
    thinking: { type: "disabled" },
    system: `Eres ${task.agentName ?? "un autor AI"}, especialista en ${roleByKey.get(task.agentKey ?? "") ?? "producción editorial"}, dentro de una sala concurrente. Los nueve autores trabajan simultáneamente sobre el mismo brief, expediente y SUBJECT 1; no esperas ni simulas un traspaso secuencial. Tu responsabilidad es: ${task.description} Trabaja sólo con la sala compartida recibida. La imagen es una fuente editorial obligatoria: el sujeto, entorno y texto visible deben guiar el enfoque; si el encargo los contradice, marca el bloqueo en vez de forzar una relación. No conviertas una apariencia visual en identidad, lugar, fecha o hecho no verificado. No inventes hechos ni imágenes y nunca publiques ni sustituyas la aprobación humana. Si recibes SUBJECT 1, analízalo pero jamás ordenes generarlo, sustituirlo, filtrarlo o modificarlo. Si la salida es SOCIAL_CARD, especifica decisiones de HTML/CSS, jerarquía y recursos visuales autorizados. Para el texto separa, cuando aplique, las líneas como “Blanco:”, “Amarillo:”, “Verde:” y “Pregunta:”. ${context.templateRules ? `REGLAS MAESTRAS OBLIGATORIAS:\n${context.templateRules}` : ""} Devuelve un entregable profesional en español de Guatemala, máximo 180 palabras.`,
    messages: [{ role: "user", content }],
  });
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: requestBody,
      cache: "no-store",
    });
    if (!response.ok) {
      const body = await response.text();
      let detail = `Claude API respondió ${response.status}`;
      try { const parsed = JSON.parse(body) as { error?: { message?: string } }; if (parsed.error?.message) detail += `: ${parsed.error.message}`; } catch {}
      if (attempt === 1 && (response.status === 429 || response.status >= 500)) { await wait(900); continue; }
      throw new Error(detail);
    }
    const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
    const output = data.content?.filter((item) => item.type === "text").map((item) => item.text ?? "").join("\n").trim();
    if (output) return output;
    if (attempt === 1) await wait(900);
  }
  throw new Error("Claude no devolvió un entregable de texto después de dos intentos.");
}

export function productionAiProvider() {
  if (process.env.DEMO_MODE !== "false") return "demo" as const;
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_ENABLED === "true") return "claude" as const;
  if (process.env.OPENAI_API_KEY) return "openai" as const;
  return "demo" as const;
}

export async function runVideoAgentTeam(projectId: string, emit: (event: AgentStreamEvent) => void | Promise<void>) {
  const project = await prisma.videoProject.findUniqueOrThrow({
    where: { id: projectId },
    include: { outlet: true, contentVariant: { include: { trend: { include: { sources: true } } } }, tasks: { orderBy: { order: "asc" } } },
  });
  const context: ProductionContext = {
    projectId,
    title: project.title,
    headline: project.outputKind === "SOCIAL_CARD" && project.cardBaseText?.trim() ? project.cardBaseText : project.contentVariant.headline,
    hook: project.outputKind === "SOCIAL_CARD" && project.cardAccentText?.trim() ? project.cardAccentText : project.contentVariant.hook,
    outlet: project.outlet.name,
    outputKind: project.outputKind as ProductionOutputKind,
    productType: project.productType!,
    objective: project.objective!,
    audience: project.audience!,
    durationSeconds: project.durationSeconds!,
    primaryPlatform: project.primaryPlatform!,
    productionNotes: project.productionNotes,
    aspectRatio: project.aspectRatio,
    resolution: project.resolution,
    captionStyle: project.captionStyle,
    voiceStyle: project.voiceStyle,
    pageSize: project.pageSize,
    documentStyle: project.documentStyle,
    subjectImagePath: project.subjectImagePath,
    subjectImageName: project.subjectImageName,
    subjectImageMime: project.subjectImageMime,
    subjectImageAnalysis: parseSubjectImageAnalysis(project.subjectImageAnalysis),
    breakingBadge: project.breakingBadge,
    cardBaseText: project.cardBaseText,
    cardAccentText: project.cardAccentText,
    cardImpactText: project.cardImpactText,
    cardQuestion: project.cardQuestion,
    templateRules: project.outputKind === "SOCIAL_CARD" && isInsomnioOutlet(project.outlet.name) ? INSOMNIO_SOCIAL_MASTER_PROMPT : null,
    sourceCount: project.contentVariant.trend.sources.length,
    sources: project.contentVariant.trend.sources.map((source) => ({ title: source.title, url: source.url, domain: source.domain, excerpt: source.excerpt, isPrimary: source.isPrimary })),
    editorialDraft: project.contentVariant.body,
    editorialWarnings: Array.isArray(project.contentVariant.warnings) ? project.contentVariant.warnings.filter((warning): warning is string => typeof warning === "string") : [],
  };
  const provider = productionAiProvider();
  const realMode = provider !== "demo";
  const deliverables = new Map<number, string>();
  const resumingFailedRun = project.agentRunStatus === "FAILED";
  if (resumingFailedRun) {
    for (const task of project.tasks) if (task.status === "DONE" && task.deliverable) deliverables.set(task.order, task.deliverable);
  }

  async function record(input: Omit<AgentStreamEvent, "id" | "createdAt">) {
    const row = await prisma.videoAgentActivity.create({ data: {
      videoProjectId: projectId, taskId: input.taskId, agentKey: input.agentKey, agentName: input.agentName,
      agentRole: input.agentRole, action: input.action, detail: input.detail, status: input.status, progress: input.progress,
    } });
    const event = { ...input, id: row.id, createdAt: row.createdAt.toISOString() } satisfies AgentStreamEvent;
    await emit(event);
  }

  await prisma.videoProject.update({ where: { id: projectId }, data: { agentRunStatus: "RUNNING", status: "IN_PROGRESS", completedAt: null, adminApprovedAt: null, adminApprovedById: null } });
  if (resumingFailedRun) {
    await prisma.videoTask.updateMany({ where: { videoProjectId: projectId, status: { not: "DONE" } }, data: { status: "PENDING", deliverable: null, completedAt: null } });
  } else {
    await prisma.videoTask.updateMany({ where: { videoProjectId: projectId }, data: { status: "PENDING", deliverable: null, completedAt: null } });
  }
  const outputLabel = context.outputKind === "EDITORIAL_DOCUMENT" ? "documento PDF" : context.outputKind === "SOCIAL_CARD" ? "tarjeta gráfica HTML" : "encargo audiovisual";
  await record({ agentKey: "nexo_orchestrator", agentName: "Nexo", agentRole: "Orquestador", action: resumingFailedRun ? "Producción reanudada" : "Producción iniciada", detail: resumingFailedRun ? `Se conservaron ${deliverables.size} entregables completos y se reanuda ${outputLabel} desde el punto detenido.` : `${provider === "claude" ? "Claude API real" : provider === "openai" ? "Agentes OpenAI reales" : "Simulación demo"}: la producción de ${outputLabel} fue distribuida entre ${aiAgentTeam.length} autores AI.`, status: "SYSTEM", progress: Math.round((deliverables.size / project.tasks.length) * 100), runStatus: "RUNNING" });

  const heartbeatDetails: Record<string, string[]> = {
    nexo_brief: ["Alba organiza el brief común y comprueba que imagen, objetivo y salida estén disponibles.", "Alba mantiene sincronizado el encargo que consultan los demás autores."],
    nexo_verify: ["Certeza contrasta el borrador con las fuentes registradas y sus advertencias.", "Certeza revisa nombres, afirmaciones y nivel de confianza del expediente."],
    nexo_script: ["Tinta redacta sobre el núcleo factual compartido mientras el resto del equipo produce.", "Tinta ajusta titular, cuerpo y llamados sin añadir datos ajenos a las fuentes."],
    nexo_visual: ["Plano explora la composición usando SUBJECT 1 y el formato de salida.", "Plano define zonas seguras, jerarquía y relación entre imagen y texto."],
    nexo_designer: ["Lumen construye el tratamiento visual con la imagen original adjunta.", "Lumen comprueba tipografía, color, legibilidad y presencia de marca."],
    nexo_production: ["Pulso organiza recursos, créditos y materiales de producción autorizados.", "Pulso documenta lo necesario para completar la pieza sin material inventado."],
    nexo_edit: ["Corte arma la salida final y adapta el montaje al formato solicitado.", "Corte revisa ritmo, extensión y especificaciones de exportación."],
    nexo_review: ["Faro audita en paralelo precisión, riesgos, derechos y coherencia visual.", "Faro marca cualquier condición que deba resolver Administración."],
    nexo_director: ["Norte observa el paquete completo y prepara una recomendación para el administrador.", "Norte consolida los criterios de salida sin aprobar ni publicar la pieza."],
  };

  const runTask = async (order: number) => {
    const task = project.tasks.find((candidate) => candidate.order === order)!;
    const agentName = task.agentName ?? "Agente AI";
    const agentKey = task.agentKey ?? `agent_${order}`;
    const agentRole = roleByKey.get(agentKey) ?? "Producción AI";
    try {
      await prisma.videoTask.update({ where: { id: task.id }, data: { status: "IN_PROGRESS" } });
      await record({ agentKey, agentName, agentRole, action: "Trabajando en paralelo", detail: heartbeatDetails[agentKey]?.[0] ?? task.title, status: "WORKING", progress: Math.round((deliverables.size / project.tasks.length) * 100), taskId: task.id, taskStatus: "IN_PROGRESS" });
      if (!realMode) await wait(order === 3 || order === 4 ? 900 : 650);
      const work = provider === "claude" ? buildClaudeDeliverable(task, context) : provider === "openai" ? buildRealDeliverable(order, task, context) : Promise.resolve(buildDemoDeliverable(order, context));
      let settled = false;
      void work.finally(() => { settled = true; }).catch(() => undefined);
      let heartbeat = 1;
      while (!settled) {
        await Promise.race([work.then(() => undefined, () => undefined), wait(7000)]);
        if (!settled) {
          const details = heartbeatDetails[agentKey] ?? [task.title];
          await record({ agentKey, agentName, agentRole, action: "Actividad en curso", detail: details[heartbeat % details.length], status: "WORKING", progress: Math.round((deliverables.size / project.tasks.length) * 100), taskId: task.id, taskStatus: "IN_PROGRESS" });
          heartbeat += 1;
        }
      }
      const deliverable = await work;
      deliverables.set(order, deliverable);
      const completed = deliverables.size;
      const progress = Math.round((completed / project.tasks.length) * 100);
      await prisma.$transaction([
        prisma.videoTask.update({ where: { id: task.id }, data: { status: "DONE", deliverable, completedAt: new Date() } }),
        prisma.videoEvidence.create({ data: { videoProjectId: projectId, taskId: task.id, authorId: null, agentKey, agentName, type: "FILE_REFERENCE", title: `${task.title} · entregable AI`, description: deliverable, metadata: { mode: provider, outputKind: context.outputKind, concurrent: true } } }),
        prisma.videoProject.update({ where: { id: projectId }, data: { progress, currentStage: progress === 100 ? "DIRECTION_REVIEW" : task.stage } }),
      ]);
      await record({ agentKey, agentName, agentRole, action: "Entregable listo", detail: deliverable, status: "DONE", progress, taskId: task.id, taskStatus: "DONE", deliverable });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "El autor no pudo completar su entrega.";
      await prisma.videoTask.update({ where: { id: task.id }, data: { status: "BLOCKED" } });
      await record({ agentKey, agentName, agentRole, action: "Entrega bloqueada", detail, status: "FAILED", progress: Math.round((deliverables.size / project.tasks.length) * 100), taskId: task.id, taskStatus: "BLOCKED" });
      throw error;
    }
  };

  try {
    for (const phase of videoAgentPhases) {
      const results = await Promise.allSettled(phase.filter((order) => !deliverables.has(order)).map(runTask));
      const failures = results.filter((result) => result.status === "rejected");
      if (failures.length) throw new Error(`${failures.length} autor${failures.length === 1 ? "" : "es"} no pudo completar su entrega. Las demás tareas finalizaron y quedan conservadas para reanudar.`);
    }
    await prisma.videoProject.update({ where: { id: projectId }, data: { agentRunStatus: "WAITING_ADMIN", status: "IN_REVIEW", currentStage: "DIRECTION_REVIEW", progress: 100 } });
    const completionLabel = context.outputKind === "EDITORIAL_DOCUMENT" ? "el PDF editorial" : context.outputKind === "SOCIAL_CARD" ? "la tarjeta gráfica HTML" : "el paquete audiovisual";
    await record({ agentKey: "nexo_orchestrator", agentName: "Nexo", agentRole: "Orquestador", action: "Control humano requerido", detail: `Los agentes finalizaron ${completionLabel}. El administrador debe aprobarlo o solicitar ajustes; nada se distribuye automáticamente.`, status: "HANDOFF", progress: 100, runStatus: "WAITING_ADMIN" });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Fallo desconocido";
    await prisma.videoProject.update({ where: { id: projectId }, data: { agentRunStatus: "FAILED", status: "BLOCKED" } });
    await record({ agentKey: "nexo_orchestrator", agentName: "Nexo", agentRole: "Orquestador", action: "Producción detenida", detail, status: "FAILED", progress: Math.round(deliverables.size / project.tasks.length * 100), runStatus: "FAILED" });
    throw error;
  }
}
