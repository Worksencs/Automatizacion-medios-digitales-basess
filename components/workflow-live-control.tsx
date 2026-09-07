"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type WorkflowEvent = { status: string; reason: string; progress: number; createdAt: string };
type PersistedEvent = { id: string; toStatus: string; reason: string; createdAt: string };

const stages = [
  { key: "SCORING", name: "Métrica", role: "Puntuación editorial" },
  { key: "INVESTIGATING", name: "Certeza", role: "Investigación y fuentes" },
  { key: "GENERATING_VARIANTS", name: "Tinta", role: "Redacción de cuatro versiones" },
  { key: "GENERATING_VARIANTS", name: "Lumen", role: "Dirección visual y formatos" },
  { key: "DRAFTS_READY", name: "Faro", role: "Control de riesgo" },
  { key: "AWAITING_APPROVAL", name: "Nexo", role: "Entrega al administrador" },
] as const;

const progressByStatus: Record<string, number> = { DETECTED: 0, SCORING: 8, SCORED: 16, INVESTIGATING: 30, EVIDENCE_INCOMPLETE: 44, EVIDENCE_READY: 48, GENERATING_VARIANTS: 62, DRAFTS_READY: 82, SYNCING_NOTION: 90, AWAITING_APPROVAL: 100, APPROVED: 100, FAILED: 0 };
const rank: Record<string, number> = { DETECTED: 0, SCORING: 1, SCORED: 2, INVESTIGATING: 3, EVIDENCE_INCOMPLETE: 4, EVIDENCE_READY: 4, GENERATING_VARIANTS: 5, DRAFTS_READY: 6, SYNCING_NOTION: 7, AWAITING_APPROVAL: 8, APPROVED: 9 };

export function WorkflowLiveControl({ runId, initialStatus, initialEvents, provider }: { runId: string; initialStatus: string; initialEvents: PersistedEvent[]; provider: "demo" | "openai" | "claude" }) {
  const router = useRouter();
  const started = useRef(false);
  const [status, setStatus] = useState(initialStatus);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [events, setEvents] = useState<WorkflowEvent[]>(initialEvents.map((event) => ({ status: event.toStatus, reason: event.reason, progress: progressByStatus[event.toStatus] ?? 0, createdAt: event.createdAt })));
  const progress = progressByStatus[status] ?? events.at(-1)?.progress ?? 0;
  const active = useMemo(() => stages.find((stage) => stage.key === status) ?? (status === "EVIDENCE_INCOMPLETE" || status === "EVIDENCE_READY" ? stages[1] : status === "SYNCING_NOTION" ? stages[5] : null), [status]);

  const startWorkflow = useCallback(async () => {
    if (running) return;
    started.current = true; setRunning(true); setMessage("");
    try {
      const response = await fetch(`/api/workflows/${runId}/run`, { method: "POST", headers: { Accept: "text/event-stream" } });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error ?? "No se pudo iniciar el equipo AI."); }
      if (!response.body) throw new Error("No se recibió el canal de actividad.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n"); buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const raw = frame.split("\n").find((line) => line.startsWith("data: "))?.slice(6); if (!raw) continue;
          const event = JSON.parse(raw);
          if (event.type === "error") throw new Error(event.error);
          if (event.type === "complete") continue;
          setStatus(event.status); setEvents((current) => [...current, event]);
        }
      }
      setMessage("El equipo terminó la investigación y creó cuatro borradores. Ya puedes revisar versiones y abrir una producción.");
      router.refresh();
    } catch (error) {
      setStatus("FAILED"); setMessage(error instanceof Error ? error.message : "La ejecución se detuvo.");
    } finally { setRunning(false); }
  }, [runId, router, running]);

  useEffect(() => {
    if (["DETECTED", "FAILED"].includes(status) && !started.current) void startWorkflow();
  }, [status, startWorkflow]);

  return <section className={`workflow-live-panel ${running ? "is-running" : ""}`} aria-live="polite">
    <header><div><span><i/> EQUIPO EDITORIAL EN VIVO</span><h2>{running ? `${active?.name ?? "Nexo"} está trabajando` : status === "AWAITING_APPROVAL" ? "Borradores listos para tu revisión" : status === "FAILED" ? "La ejecución necesita atención" : "Preparando el equipo AI"}</h2><p>{events.at(-1)?.reason ?? "El tema se distribuirá entre investigación, redacción, diseño y control editorial."}</p></div><div className="workflow-live-status"><strong>{progress}%</strong><small>{provider === "claude" ? "Claude API real" : provider === "openai" ? "OpenAI real" : "Modo demostración"}</small></div></header>
    <div className="workflow-live-progress"><i style={{ width: `${progress}%` }}/></div>
    <div className="workflow-agent-lane">{stages.map((stage, index) => { const stageRank = rank[stage.key] ?? 0; const currentRank = rank[status] ?? 0; const isActive = running && (stage.key === status || (status === "EVIDENCE_INCOMPLETE" && stage.name === "Certeza") || (status === "SYNCING_NOTION" && stage.name === "Nexo")); const done = currentRank > stageRank || ["AWAITING_APPROVAL", "APPROVED"].includes(status); return <article className={isActive ? "active" : done ? "done" : ""} key={`${stage.key}-${index}`}><span>{stage.name.slice(0, 2).toUpperCase()}</span><div><strong>{stage.name}</strong><small>{stage.role}</small></div><em>{isActive ? "EN VIVO" : done ? "LISTO" : "EN COLA"}</em></article>; })}</div>
    {message && <p className={status === "FAILED" ? "workflow-error" : "workflow-success"}>{message}</p>}
    {status === "FAILED" && <button type="button" className="primary-button" disabled={running} onClick={startWorkflow}>Reintentar equipo AI</button>}
  </section>;
}
