"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { aiAgentTeam, isProductionBriefReady, videoStageLabels, type VideoStageCode } from "@/src/domain/video-production";
import type { AgentStreamEvent } from "@/src/services/video-agent-team";
import { extractSocialCardColorCopy, extractSocialCardCopy } from "@/src/services/social-card-html";
import { INSOMNIO_SOCIAL_MASTER_PROMPT, isInsomnioOutlet, socialAspectRatioForPlatform } from "@/src/domain/insomnio-social-template";
import { assessVisualCopyAlignment, type SubjectImageAnalysis } from "@/src/domain/subject-image-analysis";

type Task = { id: string; order: number; title: string; description: string; stage: string; status: string; deliverable: string | null; agentKey: string | null; agentName: string | null };
type Activity = { id: string; agentKey: string; agentName: string; agentRole: string; action: string; detail: string; status: string; progress: number; createdAt: string; taskId?: string | null };
type Brief = { outputKind: "AUDIOVISUAL" | "EDITORIAL_DOCUMENT" | "SOCIAL_CARD"; productType: string; objective: string; audience: string; durationSeconds: number; primaryPlatform: string; productionNotes: string; aspectRatio: "16:9" | "9:16" | "4:5" | "1:1"; resolution: "1080p" | "4K"; captionStyle: "Informativos" | "Dinámicos" | "Sin subtítulos"; voiceStyle: "Informativa" | "Cálida" | "Enérgica"; pageSize: "Carta" | "A4"; documentStyle: "Nota informativa" | "Reportaje" | "Boletín" | "Informe editorial"; subjectImagePath: string | null; subjectImageName: string | null; subjectImageMime: string | null; subjectImageAnalysis: SubjectImageAnalysis | null; breakingBadge: "NONE" | "BREAKING" | "URGENT"; cardBaseText: string; cardAccentText: string; cardImpactText: string; cardQuestion: string };

const statusLabels: Record<string, string> = { IDLE: "Lista para iniciar", RUNNING: "Equipo trabajando", WAITING_ADMIN: "Espera tu decisión", COMPLETED: "Aprobada", FAILED: "Requiere atención", PAUSED: "Pausada" };
const taskStatusLabels: Record<string, string> = { PENDING: "En cola", IN_PROGRESS: "Trabajando", BLOCKED: "Bloqueado", DONE: "Entregado" };

export function VideoAgentCommandCenter({ projectId, project, mode, initialBrief, initialRunStatus, initialProgress, initialTasks, initialActivities, admin }: {
  projectId: string;
  project: { outlet: string; headline: string; hook: string };
  mode: "demo" | "openai" | "claude";
  initialBrief: Brief;
  initialRunStatus: string;
  initialProgress: number;
  initialTasks: Task[];
  initialActivities: Activity[];
  admin: { name: string; roleCode: string };
}) {
  const router = useRouter();
  const [brief, setBrief] = useState(initialBrief);
  const [runStatus, setRunStatus] = useState(initialRunStatus);
  const [progress, setProgress] = useState(initialProgress);
  const [tasks, setTasks] = useState(initialTasks);
  const [activities, setActivities] = useState(initialActivities);
  const [busy, setBusy] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [completionNotice, setCompletionNotice] = useState(["WAITING_ADMIN", "COMPLETED"].includes(initialRunStatus));
  const canOperate = ["ADMIN", "DIRECCION"].includes(admin.roleCode);
  const parametersLocked = busy || runStatus === "RUNNING";
  const isDocument = brief.outputKind === "EDITORIAL_DOCUMENT";
  const isGraphic = brief.outputKind === "SOCIAL_CARD";
  const isInsomnioTemplate = isGraphic && isInsomnioOutlet(project.outlet);
  const isAudiovisual = brief.outputKind === "AUDIOVISUAL";
  const visualAlignment = assessVisualCopyAlignment(brief.subjectImageAnalysis, [brief.cardBaseText, brief.cardAccentText, brief.cardImpactText, brief.cardQuestion]);
  const ready = isProductionBriefReady(brief) && (!isGraphic || visualAlignment !== "CONFLICT");
  const durationLabel = `${String(Math.floor(brief.durationSeconds / 60)).padStart(2, "0")}:${String(brief.durationSeconds % 60).padStart(2, "0")}:00`;

  const latestByAgent = useMemo(() => {
    const result = new Map<string, Activity>();
    for (const activity of activities) if (!result.has(activity.agentKey)) result.set(activity.agentKey, activity);
    return result;
  }, [activities]);
  const socialCopy = useMemo(() => extractSocialCardCopy(tasks.find((task) => task.order === 3)?.deliverable, { headline: project.headline, hook: project.hook }), [tasks, project.headline, project.hook]);
  const socialColorCopy = useMemo(() => {
    const generated = extractSocialCardColorCopy(tasks.find((task) => task.order === 3)?.deliverable, { headline: project.headline, hook: project.hook });
    if (!brief.cardBaseText?.trim() && !brief.cardAccentText?.trim()) return generated;
    return { base: brief.cardBaseText?.trim() ?? "", accent: brief.cardAccentText?.trim() ?? "", impact: brief.cardImpactText?.trim() ?? "", question: brief.cardQuestion?.trim() ?? "" };
  }, [tasks, project.headline, project.hook, brief.cardBaseText, brief.cardAccentText, brief.cardImpactText, brief.cardQuestion]);
  const currentActivity = runStatus === "RUNNING"
    ? activities.find((activity) => activity.status === "WORKING" && tasks.some((task) => task.id === activity.taskId && task.status === "IN_PROGRESS")) ?? activities[0]
    : activities[0];
  const currentTask = currentActivity?.taskId ? tasks.find((task) => task.id === currentActivity.taskId) : tasks.find((task) => task.status === "IN_PROGRESS");
  const completedTasks = tasks.filter((task) => task.status === "DONE").length;
  const liveLabel = runStatus === "RUNNING" ? "Ahora trabajando" : runStatus === "WAITING_ADMIN" ? "Último traspaso" : "Última actividad";

  useEffect(() => {
    if (!completionNotice) return;
    const previousTitle = document.title;
    document.title = `✓ Producción terminada · ${project.outlet}`;
    return () => { document.title = previousTitle; };
  }, [completionNotice, project.outlet]);

  function changeOutputKind(outputKind: Brief["outputKind"]) {
    setBrief({ ...brief, outputKind, productType: "", primaryPlatform: outputKind === "EDITORIAL_DOCUMENT" ? "Documento PDF" : "", aspectRatio: outputKind === "SOCIAL_CARD" ? "4:5" : outputKind === "AUDIOVISUAL" ? "16:9" : brief.aspectRatio, breakingBadge: "NONE", cardBaseText: "", cardAccentText: "", cardImpactText: "", cardQuestion: "" });
    setRunStatus("IDLE");
    setProgress(0);
    setTasks((current) => current.map((task) => ({ ...task, status: "PENDING", deliverable: null })));
    setMessage("Define el nuevo producto y guarda para adaptar el flujo del equipo.");
  }

  function changePlatform(primaryPlatform: string) {
    const preferredRatio = isGraphic ? socialAspectRatioForPlatform(primaryPlatform) : null;
    setBrief({ ...brief, primaryPlatform, aspectRatio: preferredRatio ?? brief.aspectRatio });
  }

  async function uploadSubjectImage(event: ChangeEvent<HTMLInputElement>) {
    const image = event.target.files?.[0];
    if (!image) return;
    setImageUploading(true); setMessage("");
    try {
      const form = new FormData();
      form.append("image", image);
      form.append("productionNotes", brief.productionNotes);
      form.append("objective", brief.objective);
      form.append("audience", brief.audience);
      form.append("cardBaseText", brief.cardBaseText);
      form.append("cardAccentText", brief.cardAccentText);
      form.append("cardImpactText", brief.cardImpactText);
      form.append("cardQuestion", brief.cardQuestion);
      const response = await fetch(`/api/videos/${projectId}/subject-image`, { method: "POST", body: form });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "No se pudo adjuntar la imagen.");
      setBrief((current) => {
        const analysis = data.analysis as SubjectImageAnalysis | null;
        const useSuggestion = Boolean(analysis && !current.cardBaseText.trim() && !current.cardAccentText.trim());
        return { ...current, subjectImagePath: data.path, subjectImageName: data.name, subjectImageMime: data.mimeType, subjectImageAnalysis: analysis, ...(useSuggestion ? { cardBaseText: analysis!.suggestedCopy.base, cardAccentText: analysis!.suggestedCopy.accent, cardImpactText: analysis!.suggestedCopy.impact, cardQuestion: analysis!.suggestedCopy.question } : {}) };
      });
      setActivities((current) => [{ id: crypto.randomUUID(), agentKey: data.analysis ? "nexo_vision" : "human_admin", agentName: data.analysis ? "Ojo" : admin.name, agentRole: data.analysis ? "Análisis visual AI" : "Administrador humano", action: data.analysis ? "Lectura visual completada" : "Imagen principal adjunta", detail: data.analysis ? `${data.analysis.summary} Esta lectura guiará a todo el equipo.` : `${data.name} quedó adjunta sin alteraciones.`, status: data.analysis ? "DONE" : "SYSTEM", progress, createdAt: new Date().toISOString() }, ...current]);
      setMessage(data.analysis ? "Imagen analizada. Ojo AI comparó lo visible con el encargo y preparó una propuesta editorial." : `Imagen adjunta. ${data.analysisWarning || "El análisis visual quedó pendiente."}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo adjuntar la imagen."); }
    finally { setImageUploading(false); event.target.value = ""; }
  }

  async function analyzeCurrentImage() {
    setImageUploading(true); setMessage("");
    try {
      const response = await fetch(`/api/videos/${projectId}/subject-image`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ productionNotes: brief.productionNotes, objective: brief.objective, audience: brief.audience, cardBaseText: brief.cardBaseText, cardAccentText: brief.cardAccentText, cardImpactText: brief.cardImpactText, cardQuestion: brief.cardQuestion }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "No se pudo analizar la imagen.");
      setBrief((current) => ({ ...current, subjectImageAnalysis: data.analysis }));
      setActivities((current) => [{ id: crypto.randomUUID(), agentKey: "nexo_vision", agentName: "Ojo", agentRole: "Análisis visual AI", action: "Lectura visual completada", detail: `${data.analysis.summary} Esta lectura guiará a todo el equipo.`, status: "DONE", progress, createdAt: new Date().toISOString() }, ...current]);
      setMessage("Lectura visual actualizada. Revisa la coherencia o aplica la propuesta de Ojo AI.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo analizar la imagen."); }
    finally { setImageUploading(false); }
  }

  function applyVisualSuggestion() {
    const suggestion = brief.subjectImageAnalysis?.suggestedCopy;
    if (!suggestion) return;
    setBrief({ ...brief, cardBaseText: suggestion.base, cardAccentText: suggestion.accent, cardImpactText: suggestion.impact, cardQuestion: suggestion.question });
    setMessage("Propuesta visual aplicada al mockup. Puedes editarla antes de guardar.");
  }

  async function saveBrief(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/videos/${projectId}/brief`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(brief) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "No se pudo guardar el encargo.");
      setRunStatus("IDLE"); setProgress(0); setCompletionNotice(false);
      if (data.project?.aspectRatio) setBrief((current) => ({ ...current, aspectRatio: data.project.aspectRatio }));
      setTasks(data.tasks ?? tasks.map((task) => ({ ...task, status: "PENDING", deliverable: null })));
      setActivities((current) => [{ id: crypto.randomUUID(), agentKey: "human_admin", agentName: admin.name, agentRole: "Administrador humano", action: "Encargo definido", detail: isDocument ? `${brief.productType} · ${brief.documentStyle} · PDF ${brief.pageSize}` : isGraphic ? `${brief.productType} · HTML ${brief.aspectRatio} · ${brief.primaryPlatform}` : `${brief.productType} · ${brief.durationSeconds} s · ${brief.primaryPlatform}`, status: "SYSTEM", progress: 0, createdAt: new Date().toISOString() }, ...current]);
      await startTeam(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar."); }
    finally { setBusy(false); }
  }

  function applyAgentEvent(event: AgentStreamEvent) {
    setActivities((current) => [{ ...event }, ...current]);
    setProgress(event.progress);
    if (event.runStatus) {
      setRunStatus(event.runStatus);
      if (event.runStatus === "WAITING_ADMIN") {
        setCompletionNotice(true);
        try { if ("Notification" in window && Notification.permission === "granted") new Notification("Producción terminada", { body: `${project.outlet}: el equipo AI terminó el paquete y espera tu revisión.` }); } catch {}
      }
    }
    if (event.taskId) setTasks((current) => current.map((task) => task.id === event.taskId ? { ...task, status: event.taskStatus ?? task.status, deliverable: event.deliverable ?? task.deliverable } : task));
  }

  async function startTeam(resumingOverride?: boolean) {
    const resuming = resumingOverride ?? runStatus === "FAILED";
    setBusy(true); setMessage(""); setRunStatus("RUNNING");
    setCompletionNotice(false);
    if (!resuming) setTasks((current) => current.map((task) => ({ ...task, status: "PENDING", deliverable: null })));
    try {
      const response = await fetch(`/api/videos/${projectId}/agents/run`, { method: "POST", headers: { Accept: "text/event-stream" } });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error ?? "No se pudo iniciar el equipo AI."); }
      if (!response.body) throw new Error("El navegador no recibió el canal en tiempo real.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n"); buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const raw = frame.split("\n").find((line) => line.startsWith("data: "))?.slice(6); if (!raw) continue;
          const data = JSON.parse(raw);
          if (data.type === "error") throw new Error(data.error);
          if (data.type !== "complete") applyAgentEvent(data as AgentStreamEvent);
        }
      }
      setCompletionNotice(true); setMessage(`Los ${aiAgentTeam.length} autores AI terminaron el paquete conjunto. Recibiste una notificación y ahora requiere tu decisión.`);
    } catch (error) { setRunStatus("FAILED"); setMessage(error instanceof Error ? error.message : "La ejecución se detuvo."); }
    finally { setBusy(false); router.refresh(); }
  }

  async function decide(action: "APPROVE" | "REQUEST_CHANGES") {
    const comment = action === "APPROVE" ? "Paquete revisado y aprobado por Administración." : "Revisar el paquete según las observaciones del administrador.";
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/videos/${projectId}/admin-decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, comment }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "No se pudo registrar la decisión.");
      setRunStatus(data.status); setMessage(action === "APPROVE" ? "Aprobación humana registrada. Nada se publicó automáticamente." : "Ajustes solicitados. Puedes volver a ejecutar el equipo."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo registrar la decisión."); }
    finally { setBusy(false); }
  }

  const orderPrepared = Boolean(brief.productionNotes.trim() && brief.subjectImagePath);
  const flowIndex = ["COMPLETED", "WAITING_ADMIN"].includes(runStatus) ? 4 : ["RUNNING", "FAILED", "PAUSED"].includes(runStatus) ? 1 : 0;
  const flowSteps = [
    { number: "01", label: "Orden", detail: flowIndex > 0 ? "Orden registrada" : orderPrepared ? "Encargo definido" : "Falta completar", href: "#production-settings" },
    { number: "02", label: "Producción AI", detail: runStatus === "RUNNING" ? "Equipo en vivo" : flowIndex > 1 ? "Trabajo terminado" : "Pendiente", href: "#live-production" },
    { number: "03", label: "Producto", detail: flowIndex > 2 ? "Construido" : "En construcción", href: "#product-preview" },
    { number: "04", label: "Resultados AI", detail: flowIndex >= 4 ? `${completedTasks} entregas` : "Pendiente", href: "#agent-results" },
    { number: "05", label: "Aprobación", detail: runStatus === "COMPLETED" ? "Aprobada" : runStatus === "WAITING_ADMIN" ? "Decisión requerida" : "Bloqueada", href: "#approval" },
  ];

  return <div className="production-flow">
    {completionNotice && <section className="production-complete-notification" role="alert"><span>✓</span><div><strong>Producción terminada</strong><p>Los nueve autores AI completaron el paquete conjunto de {project.outlet}. Administración debe revisarlo.</p></div><button type="button" aria-label="Cerrar notificación" onClick={() => setCompletionNotice(false)}>×</button></section>}
    <nav className="production-flow-steps" aria-label="Etapas de la producción">{flowSteps.map((step, index) => <a className={`${index < flowIndex ? "done" : ""} ${index === flowIndex ? "active" : ""}`} href={step.href} aria-current={index === flowIndex ? "step" : undefined} key={step.number}><span>{index < flowIndex ? "✓" : step.number}</span><div><strong>{step.label}</strong><small>{step.detail}</small></div></a>)}</nav>
    {(orderPrepared || flowIndex > 0) && <section className={`studio-console ${isDocument ? "document-console" : isGraphic ? "graphic-console" : ""}`} id="product-preview">
      <header className="studio-section-head"><span className="eyebrow">03 · PRODUCTO EN CONSTRUCCIÓN</span><h3>Vista previa del resultado conjunto</h3><p>El producto toma forma con las entregas del equipo; todavía requiere aprobación humana.</p></header>
      {isDocument ? <div className="program-monitor document-monitor">
        <div className="monitor-bar"><span><i/> PREVISUALIZACIÓN EDITORIAL</span><strong>PDF · {brief.pageSize}</strong></div>
        <div className="document-stage"><article className="paper-preview"><header><b>{project.outlet}</b><span>BORRADOR EDITORIAL</span></header><small>{brief.documentStyle} · {brief.productType || "Producto por definir"}</small><h2>{project.headline}</h2><p className="paper-deck">{project.hook}</p><div className="paper-rule"/><div className="paper-columns"><p>{brief.objective || "El objetivo editorial aparecerá aquí cuando se defina el encargo."}</p><p>Los autores AI redactan, verifican y maquetan el documento. Cada entrega queda registrada para revisión humana.</p></div><footer>Fuentes verificadas · Revisión humana requerida <b>{progress}%</b></footer></article></div>
        <div className="document-progress"><span><i style={{ width: `${progress}%` }}/></span><strong>{progress}% MAQUETADO</strong></div>
      </div> : isGraphic ? <div className={`program-monitor graphic-monitor ${isInsomnioTemplate ? "insomnio-monitor" : ""}`}>
        <div className="monitor-bar"><span><i/> PREVISUALIZACIÓN DE TARJETA</span><strong>HTML · {brief.aspectRatio}</strong></div>
        <div className={`social-card-stage ratio-${brief.aspectRatio.replace(":", "x")}`}>
          {isInsomnioTemplate ? <div className="social-card-canvas insomnio-card-canvas">
            <div className={`insomnio-subject ${brief.subjectImagePath ? "has-image" : ""}`}>{brief.subjectImagePath ? <Image src={brief.subjectImagePath} alt="Imagen principal proporcionada por el usuario" fill sizes="235px" unoptimized priority/> : <span>SUBJECT 1<small>Adjunta la imagen principal original</small></span>}</div>
            <div className="insomnio-lockup"><div className="insomnio-mark"><b>i</b><em>Guatemala</em></div><div><strong>INSOMNIO GUATEMALA</strong><small>El dato que no te deja dormir</small></div></div>
            {brief.breakingBadge !== "NONE" && <div className="insomnio-breaking">{brief.breakingBadge === "BREAKING" ? "ÚLTIMO MOMENTO" : "URGENTE | GUATEMALA"}</div>}
            <div className="insomnio-copy"><h2><span>{socialColorCopy.base}</span><b>{socialColorCopy.accent}</b>{socialColorCopy.impact && <em>{socialColorCopy.impact}</em>}{socialColorCopy.question && <strong>{socialColorCopy.question}</strong>}</h2></div>
          </div> : <div className="social-card-canvas">
            <div className="social-card-visuals"><div>{brief.subjectImagePath ? <Image src={brief.subjectImagePath} alt="Imagen principal proporcionada por el usuario" fill sizes="205px" unoptimized/> : <span>IMAGEN AUTORIZADA 01</span>}</div><div><span>IMAGEN AUTORIZADA 02</span></div></div>
            <div className="social-card-brand"><b>{project.outlet}</b><small>MEDIO INFORMATIVO</small></div>
            <div className="social-card-copy"><small>{brief.productType || "TARJETA INFORMATIVA"} · CONTENIDO EN REVISIÓN</small><h2>{socialCopy.headline}</h2><p>{socialCopy.hook}</p></div>
            <footer><span>{brief.primaryPlatform || "Redes sociales"}</span><b>REVISIÓN HUMANA · {progress}%</b></footer>
          </div>}
        </div>
        <div className="document-progress"><span><i style={{ width: `${progress}%` }}/></span><strong>{progress}% MAQUETADO HTML</strong></div>
      </div> : <div className="program-monitor">
        <div className="monitor-bar"><span><i/> PREVISUALIZACIÓN DE PROGRAMA</span><strong>{brief.aspectRatio} · {brief.resolution}</strong></div>
        <div className={`monitor-stage ratio-${brief.aspectRatio.replace(":", "x")}`}><div className="safe-frame"/><div className="monitor-copy"><small>{project.outlet} · PIEZA EN PREPARACIÓN</small><h2>{project.headline}</h2><p>{project.hook}</p><div className="lower-third"><b>{brief.productType || "Producto por definir"}</b><span>{brief.primaryPlatform || "Sin destino"} · {brief.durationSeconds}s</span></div></div></div>
        <div className="transport-bar"><button type="button" aria-label="Vista previa no disponible" disabled>▶</button><span className="scrubber"><i style={{ width: `${progress}%` }}/></span><time>00:00:00 / {durationLabel}</time><em>VOL ▮▮</em></div>
      </div>}
      <aside className="control-rack"><header><div><span className={`run-dot ${runStatus === "RUNNING" ? "live" : ""}`}/><small>CONTROL DE PRODUCCIÓN</small></div><strong>{statusLabels[runStatus] ?? runStatus}</strong></header><div className="rack-progress"><span><i style={{ width: `${progress}%` }}/></span><b>{progress}%</b></div>{isDocument ? <dl><div><dt>Salida</dt><dd>Documento PDF</dd></div><div><dt>Tamaño</dt><dd>{brief.pageSize}</dd></div><div><dt>Estilo</dt><dd>{brief.documentStyle}</dd></div><div><dt>Autoría</dt><dd>Equipo AI</dd></div><div><dt>Estado</dt><dd>{runStatus === "COMPLETED" ? "Aprobado" : "Borrador"}</dd></div><div><dt>Control</dt><dd>Administrador</dd></div></dl> : isGraphic ? <dl><div><dt>Salida</dt><dd>HTML + PNG</dd></div><div><dt>Formato</dt><dd>{brief.aspectRatio}</dd></div><div><dt>Destino</dt><dd>{brief.primaryPlatform || "—"}</dd></div><div><dt>Subject 1</dt><dd>{brief.subjectImagePath ? "Adjunto" : "Pendiente"}</dd></div><div><dt>Lectura AI</dt><dd>{brief.subjectImageAnalysis ? visualAlignment === "CONFLICT" ? "Revisar" : "Coherente" : "Pendiente"}</dd></div><div><dt>Estado</dt><dd>{runStatus === "COMPLETED" ? "Aprobada" : "Borrador"}</dd></div><div><dt>Control</dt><dd>Administrador</dd></div></dl> : <dl><div><dt>Salida</dt><dd>{brief.primaryPlatform || "—"}</dd></div><div><dt>Formato</dt><dd>{brief.aspectRatio}</dd></div><div><dt>Master</dt><dd>{brief.resolution}</dd></div><div><dt>Subtítulos</dt><dd>{brief.captionStyle}</dd></div><div><dt>Voz</dt><dd>{brief.voiceStyle}</dd></div><div><dt>Duración</dt><dd>{brief.durationSeconds}s</dd></div></dl>}<a href="#production-settings">Ajustar parámetros ↓</a>{isDocument && progress === 100 && <a className="pdf-download" href={`/api/videos/${projectId}/export/pdf`}>Descargar PDF</a>}{isGraphic && progress === 100 && <a className="pdf-download" href={`/api/videos/${projectId}/export/card`}>Descargar HTML</a>}<p>{isDocument ? "El PDF se genera con los entregables del equipo y queda marcado para revisión humana." : isGraphic ? "La tarjeta se compone en HTML/CSS; la lectura visual de SUBJECT 1 guía el tema y la imagen se conserva intacta." : "Monitor técnico del paquete. El archivo de video se conecta en la siguiente fase."}</p></aside>
    </section>}

    <section className="admin-observer">
      <div className="admin-identity"><span>AD</span><div><small>Tu puesto en esta sala</small><strong>{admin.name} · Administrador observador</strong><p>Supervisas puntos críticos, ves quién produce cada entrega y conservas la decisión final. No redactas ni editas el producto.</p></div></div>
      <div className="run-summary"><span className={`run-dot ${runStatus === "RUNNING" ? "live" : ""}`}/><div><small>Estado del equipo</small><strong>{statusLabels[runStatus] ?? runStatus}</strong><em>{mode === "claude" ? `${aiAgentTeam.length} autores con Claude API real` : mode === "openai" ? `${aiAgentTeam.length} agentes OpenAI reales` : "Simulación en tiempo real"}</em></div></div>
    </section>

    <section className="panel production-brief" id="production-settings">
      <div className="panel-head"><div><span className="eyebrow">01 · ORDEN DE TRABAJO</span><h3>Define exactamente qué debe producir el equipo</h3><p>La orden se registra primero. Después de enviarla, los nueve autores AI empiezan juntos con el mismo encargo.</p></div><span className={`brief-state ${ready || flowIndex > 0 ? "ready" : visualAlignment === "CONFLICT" ? "warning" : ""}`}>{flowIndex > 0 ? "Orden registrada" : ready ? "Orden completa" : visualAlignment === "CONFLICT" ? "Texto e imagen no coinciden" : !brief.productionNotes.trim() ? "Falta la orden" : !brief.subjectImagePath ? "Falta la imagen" : "Faltan datos"}</span></div>
      <form onSubmit={saveBrief} className="brief-form">
        <label className="production-request-field">Solicitud principal<textarea disabled={parametersLocked} rows={4} minLength={10} maxLength={1000} value={brief.productionNotes} onChange={(event) => setBrief({ ...brief, productionNotes: event.target.value })} placeholder="Ej.: Crear una tarjeta para Instagram usando la imagen adjunta. Investigar el contexto, redactar un titular factual y construir el arte final con la plantilla de Insomnio Guatemala." required/><span>Esta instrucción se comparte sin cambios con todos los autores AI.</span></label>
        <label className="output-kind-field">Naturaleza del producto<select disabled={parametersLocked} value={brief.outputKind} onChange={(event) => changeOutputKind(event.target.value as Brief["outputKind"])}><option value="AUDIOVISUAL">Audiovisual</option><option value="EDITORIAL_DOCUMENT">Documento editorial / redacción</option><option value="SOCIAL_CARD">Tarjeta gráfica social (HTML)</option></select></label>
        <label>{isDocument ? "Producto editorial" : isGraphic ? "Producto gráfico" : "Producto audiovisual"}<select disabled={parametersLocked} value={brief.productType} onChange={(event) => setBrief({ ...brief, productType: event.target.value })} required><option value="">Seleccionar…</option>{isDocument ? <><option>Nota periodística</option><option>Reportaje</option><option>Boletín informativo</option><option>Informe de investigación</option></> : isGraphic ? <><option>Tarjeta informativa</option><option>Última hora</option><option>Comparativa visual</option><option>Dato destacado</option></> : <><option>Video explicativo de servicio</option><option>Reel / Short vertical</option><option>Boletín audiovisual</option><option>Historia vertical</option><option>Paquete multiplataforma</option></>}</select></label>
        <label>Plataforma de salida{isDocument ? <input disabled value="Documento PDF" aria-label="Plataforma de salida"/> : <select disabled={parametersLocked} value={brief.primaryPlatform} onChange={(event) => changePlatform(event.target.value)} required><option value="">Seleccionar…</option>{isGraphic ? <><option>Instagram Feed</option><option>Instagram Story / Reel</option><option>Facebook Feed</option><option>Facebook Story / Reel</option><option>TikTok</option><option>YouTube Shorts</option><option>X / Threads</option><option>Multiplataforma</option></> : <><option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Facebook</option><option>Sitio web / TV</option><option>Multiplataforma</option></>}</select>}</label>
        {isAudiovisual && <label>Duración objetivo<div className="input-suffix"><input disabled={parametersLocked} type="number" min={10} max={3600} value={brief.durationSeconds || ""} onChange={(event) => setBrief({ ...brief, durationSeconds: Number(event.target.value) })} required/><span>segundos</span></div></label>}
        <label className="wide-field">Objetivo<input disabled={parametersLocked} value={brief.objective} onChange={(event) => setBrief({ ...brief, objective: event.target.value })} placeholder="Qué debe comprender o hacer la audiencia" required/></label>
        <label>Audiencia<input disabled={parametersLocked} value={brief.audience} onChange={(event) => setBrief({ ...brief, audience: event.target.value })} placeholder="A quién va dirigido" required/></label>
        <div className={`required-image-upload wide-field ${brief.subjectImagePath ? "ready" : ""}`}><div><span>SUBJECT 1 · OBLIGATORIA</span><strong>{brief.subjectImagePath ? "Imagen adjunta y disponible para todo el equipo" : "Adjunta la imagen antes de solicitar la producción"}</strong><small>Ojo la analiza; Plano y Lumen diseñan con el original; Certeza y Faro verifican su relación con la información.</small></div><label className="subject-upload">Seleccionar imagen<input disabled={parametersLocked || imageUploading} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadSubjectImage} required={!brief.subjectImagePath}/><span>{imageUploading ? "Adjuntando y analizando…" : brief.subjectImageName ? `✓ ${brief.subjectImageName}` : "JPG, PNG o WEBP · máximo 8 MB"}</span></label></div>
        {isGraphic && <div className="card-copy-fields wide-field"><div><strong>Indicaciones de texto opcionales</strong><span>Déjalas vacías para que Tinta proponga el texto a partir de la solicitud, las fuentes y la imagen.</span></div><label>Hecho base · blanco<input disabled={parametersLocked} maxLength={100} value={brief.cardBaseText ?? ""} onChange={(event) => setBrief({ ...brief, cardBaseText: event.target.value })} placeholder="Opcional"/></label><label>Giro destacado · amarillo<input disabled={parametersLocked} maxLength={100} value={brief.cardAccentText ?? ""} onChange={(event) => setBrief({ ...brief, cardAccentText: event.target.value })} placeholder="Opcional"/></label><label>Dato de impacto · verde<input disabled={parametersLocked} maxLength={100} value={brief.cardImpactText ?? ""} onChange={(event) => setBrief({ ...brief, cardImpactText: event.target.value })} placeholder="Opcional"/></label><label>Pregunta final<input disabled={parametersLocked} maxLength={80} value={brief.cardQuestion ?? ""} onChange={(event) => setBrief({ ...brief, cardQuestion: event.target.value })} placeholder="Opcional"/></label></div>}
        {brief.subjectImagePath && <article className={`visual-analysis-panel wide-field alignment-${visualAlignment.toLowerCase()}`}><header><div><span>OJO AI · LECTURA VISUAL COMPARTIDA</span><strong>{brief.subjectImageAnalysis ? visualAlignment === "CONFLICT" ? "Requiere corrección" : visualAlignment === "ALIGNED" ? "Texto e imagen coherentes" : "Disponible para los nueve autores" : "Pendiente de análisis"}</strong></div><button type="button" className="secondary-button" disabled={parametersLocked || imageUploading || mode !== "claude"} onClick={analyzeCurrentImage}>{imageUploading ? "Analizando…" : brief.subjectImageAnalysis ? "Analizar otra vez" : "Analizar imagen"}</button></header>{brief.subjectImageAnalysis ? <><p>{brief.subjectImageAnalysis.summary}</p><div className="visual-analysis-tags">{brief.subjectImageAnalysis.subjects.map((subject) => <span key={subject}>{subject}</span>)}</div>{brief.subjectImageAnalysis.visibleText.length > 0 && <small>Texto visible: {brief.subjectImageAnalysis.visibleText.join(" · ")}</small>}{brief.subjectImageAnalysis.warnings.length > 0 && <ul>{brief.subjectImageAnalysis.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}<footer><span>Confianza visual {brief.subjectImageAnalysis.confidence}% · La imagen guía el trabajo, pero no verifica hechos externos.</span>{isGraphic && <button type="button" className="secondary-button" disabled={parametersLocked} onClick={applyVisualSuggestion}>Usar propuesta de Ojo AI</button>}</footer></> : <p>{mode === "claude" ? "Ojo AI puede reconocer el sujeto y leer texto visible antes de que los nueve autores comiencen juntos." : "La imagen seguirá disponible para diseño, redacción y revisión del equipo."}</p>}</article>}
        {isDocument ? <fieldset className="av-parameters document-parameters"><legend>Parámetros del documento</legend><label>Tamaño de página<select disabled={parametersLocked} value={brief.pageSize} onChange={(event) => setBrief({ ...brief, pageSize: event.target.value as Brief["pageSize"] })}><option>Carta</option><option>A4</option></select></label><label>Estilo editorial<select disabled={parametersLocked} value={brief.documentStyle} onChange={(event) => setBrief({ ...brief, documentStyle: event.target.value as Brief["documentStyle"] })}><option>Nota informativa</option><option>Reportaje</option><option>Boletín</option><option>Informe editorial</option></select></label><div className="pdf-output-note"><strong>PDF será la salida final</strong><span>Incluirá cabecera, contenido redactado por el equipo, fuentes, entregables y estado de aprobación.</span></div></fieldset> : isGraphic ? <fieldset className="av-parameters graphic-parameters"><legend>Parámetros de la tarjeta</legend><label>Relación automática<input disabled value={`${brief.aspectRatio} · según ${brief.primaryPlatform || "plataforma"}`}/></label><label>Tratamiento del titular<select disabled={parametersLocked} value={brief.captionStyle} onChange={(event) => setBrief({ ...brief, captionStyle: event.target.value as Brief["captionStyle"] })}><option>Informativos</option><option>Dinámicos</option></select></label><label>Badge de urgencia<select disabled={parametersLocked} value={brief.breakingBadge} onChange={(event) => setBrief({ ...brief, breakingBadge: event.target.value as Brief["breakingBadge"] })}><option value="NONE">Sin badge</option><option value="BREAKING">Último momento</option><option value="URGENT">Urgente | Guatemala</option></select></label><div className={`master-prompt-card ${isInsomnioTemplate ? "active" : ""}`}><div><strong>{isInsomnioTemplate ? "Plantilla maestra Insomnio activa" : "Plantilla maestra Insomnio disponible"}</strong><span>{isInsomnioTemplate ? `${brief.aspectRatio} · imagen 62% · texto 38% · reglas enviadas a Lumen` : "Se activa automáticamente en una producción de Insomnio Guatemala."}</span></div><details><summary>Ver prompt maestro</summary><pre>{INSOMNIO_SOCIAL_MASTER_PROMPT}</pre></details></div><div className="pdf-output-note graphic-output-note"><strong>HTML editable + exportación PNG</strong><span>La imagen adjunta se conserva sin filtros ni generación y se incorpora al prompt del diseñador.</span></div></fieldset> : <fieldset className="av-parameters"><legend>Parámetros audiovisuales</legend><label>Relación<select disabled={parametersLocked} value={brief.aspectRatio} onChange={(event) => setBrief({ ...brief, aspectRatio: event.target.value as Brief["aspectRatio"] })}><option>16:9</option><option>9:16</option><option>1:1</option></select></label><label>Resolución<select disabled={parametersLocked} value={brief.resolution} onChange={(event) => setBrief({ ...brief, resolution: event.target.value as Brief["resolution"] })}><option>1080p</option><option>4K</option></select></label><label>Subtítulos<select disabled={parametersLocked} value={brief.captionStyle} onChange={(event) => setBrief({ ...brief, captionStyle: event.target.value as Brief["captionStyle"] })}><option>Informativos</option><option>Dinámicos</option><option>Sin subtítulos</option></select></label><label>Voz<select disabled={parametersLocked} value={brief.voiceStyle} onChange={(event) => setBrief({ ...brief, voiceStyle: event.target.value as Brief["voiceStyle"] })}><option>Informativa</option><option>Cálida</option><option>Enérgica</option></select></label></fieldset>}
        <div className="brief-actions"><span>{["WAITING_ADMIN", "COMPLETED"].includes(runStatus) ? "La orden original ya fue ejecutada. Para una nueva versión, actualiza los datos requeridos y vuelve a enviarla." : !brief.productionNotes.trim() ? "Primero escribe qué debe producir el equipo." : !brief.subjectImagePath ? "Ahora adjunta la imagen principal que acompañará la solicitud." : runStatus === "FAILED" ? "Puedes reanudar las entregas completas o volver a enviar la solicitud." : "Al enviarla, los nueve autores comienzan a trabajar al mismo tiempo."}</span>{runStatus === "FAILED" && <button type="button" className="secondary-button" disabled={busy || !canOperate} onClick={() => startTeam(true)}>Reanudar entregas</button>}<button type="submit" className="primary-button agent-launch" disabled={parametersLocked || !ready || !canOperate}>{runStatus === "RUNNING" ? "Equipo trabajando…" : ["WAITING_ADMIN", "COMPLETED"].includes(runStatus) ? "Enviar nueva solicitud" : "Enviar solicitud y comenzar"}</button></div>
      </form>
      {message && <p className="command-message" role="status">{message}</p>}
    </section>

    <section className={`panel live-operations ${runStatus === "RUNNING" ? "is-live" : ""}`} id="live-production" aria-live="polite">
      <header className="live-operations-head"><div><span className="eyebrow"><i className={runStatus === "RUNNING" ? "live" : ""}/> 02 · PRODUCCIÓN AI EN TIEMPO REAL</span><h3>Todo el equipo trabaja simultáneamente</h3><p>Investigación, redacción, diseño, producción y control comparten la misma orden y avanzan en paralelo.</p></div><div className="live-kpis"><span><b>{completedTasks}/{tasks.length || aiAgentTeam.length}</b> entregas</span><span><b>{progress}%</b> avance</span><strong>{statusLabels[runStatus] ?? runStatus}</strong></div></header>
      <div className="live-operations-grid">
        <article className="live-now-card"><div className="live-now-label"><span className={`run-dot ${runStatus === "RUNNING" ? "live" : ""}`}/>{liveLabel}</div><div className="live-now-author"><span>{(currentActivity?.agentName ?? "Nexo").slice(0, 2).toUpperCase()}</span><div><small>{currentActivity?.agentRole ?? "Orquestador editorial"}</small><h4>{currentActivity?.agentName ?? "Equipo AI preparado"}</h4><strong>{currentTask?.title ?? currentActivity?.action ?? "Esperando el encargo"}</strong></div><div className={`signal-bars ${runStatus === "RUNNING" ? "active" : ""}`} aria-hidden="true"><i/><i/><i/><i/><i/></div></div><p>{currentActivity?.detail ?? "Al iniciar la producción, aquí verás cada acción en el momento en que ocurre."}</p><div className="live-now-progress"><span><i style={{ width: `${progress}%` }}/></span><b>{progress}%</b></div></article>
        <div className="agent-runway">{aiAgentTeam.map((agent) => { const latest = latestByAgent.get(agent.key); const task = tasks.find((candidate) => candidate.agentKey === agent.key); const active = task?.status === "IN_PROGRESS"; const done = task?.status === "DONE"; return <article className={`${active ? "active" : ""} ${done ? "done" : ""}`} key={agent.key}><span>{agent.initials}</span><div><strong>{agent.name}</strong><small>{active ? task?.title : done ? "Entregó" : "En espera"}</small></div><i/><em>{active ? "EN VIVO" : done ? "LISTO" : latest?.action ?? "COLA"}</em></article>; })}</div>
        <div className="event-ticker"><header><strong>Actividad concurrente</strong><span>Hora de Guatemala</span></header>{activities.length === 0 ? <div className="empty-activity">El canal se activará al solicitar la producción.</div> : activities.slice(0, 12).map((activity) => <details key={activity.id} className={`ticker-event activity-${activity.status.toLowerCase()}`}><summary><span>{activity.agentName.slice(0, 2).toUpperCase()}</span><div><strong>{activity.agentName}</strong><b>{activity.action}</b></div><time>{new Date(activity.createdAt).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time></summary><p>{activity.detail}</p></details>)}</div>
      </div>
    </section>

    <section className="panel production-pipeline" id="agent-results"><div className="panel-head"><div><span className="eyebrow">04 · RESULTADOS DEL EQUIPO</span><h3>Entrega final de cada autor AI</h3><p>Ningún resultado queda oculto: puedes revisar qué hizo cada especialista y leer su entrega completa.</p></div><span className="results-total">{completedTasks}/{tasks.length || aiAgentTeam.length} listos</span></div><div className="agent-result-grid">{tasks.map((task) => { const agent = aiAgentTeam.find((candidate) => candidate.key === task.agentKey); const latest = task.agentKey ? latestByAgent.get(task.agentKey) : undefined; return <article className={`agent-result-card status-${task.status.toLowerCase()}`} key={task.id}><header><span>{agent?.initials ?? String(task.order).padStart(2, "0")}</span><div><strong>{task.agentName ?? agent?.name ?? "Autor AI"}</strong><small>{agent?.role ?? videoStageLabels[task.stage as VideoStageCode]}</small></div><em>{taskStatusLabels[task.status]}</em></header><div className="agent-result-assignment"><span>{String(task.order).padStart(2, "0")}</span><div><small>RESPONSABILIDAD</small><strong>{task.title}</strong><p>{task.description}</p></div></div>{task.deliverable ? <div className="agent-final-deliverable"><small>ENTREGA FINAL</small><p>{task.deliverable}</p></div> : <div className="agent-pending-deliverable"><small>{task.status === "IN_PROGRESS" ? "TRABAJANDO AHORA" : "RESULTADO PENDIENTE"}</small><p>{latest?.detail ?? "Su resultado aparecerá aquí en cuanto el equipo reciba y procese la orden."}</p></div>}</article>; })}</div></section>

    <section className={`human-checkpoint ${runStatus === "WAITING_ADMIN" ? "attention" : ""}`} id="approval"><div><span className="eyebrow">05 · APROBACIÓN HUMANA</span><h3>{runStatus === "WAITING_ADMIN" ? "El equipo terminó. Tu decisión es necesaria." : runStatus === "COMPLETED" ? "Paquete aprobado por el administrador" : "La decisión permanece bloqueada hasta completar el paquete"}</h3><p>Los agentes recomiendan; tú autorizas o devuelves el trabajo. La plataforma no {isDocument ? "distribuye el PDF" : isGraphic ? "publica la tarjeta" : "publica el video"} automáticamente.</p></div><div>{isDocument && progress === 100 && <a className="secondary-button" href={`/api/videos/${projectId}/export/pdf`}>Descargar PDF</a>}{isGraphic && progress === 100 && <a className="secondary-button" href={`/api/videos/${projectId}/export/card`}>Descargar HTML</a>}<button className="secondary-button" disabled={busy || runStatus !== "WAITING_ADMIN" || !canOperate} onClick={() => decide("REQUEST_CHANGES")}>Solicitar ajustes</button><button className="primary-button" disabled={busy || runStatus !== "WAITING_ADMIN" || !canOperate} onClick={() => decide("APPROVE")}>Aprobar paquete</button></div></section>
  </div>;
}
