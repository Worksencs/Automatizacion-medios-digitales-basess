import { notFound } from "next/navigation";
import { AppFrame } from "@/components/app-frame";
import { WorkflowLiveControl } from "@/components/workflow-live-control";
import { prisma } from "@/src/db";
import { editorialAiProvider } from "@/src/adapters/openai";

export const dynamic = "force-dynamic";

export default async function DossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let trend;
  try {
    trend = await prisma.trend.findUnique({
      where: { id },
      include: {
        scores: { orderBy: { calculatedAt: "desc" }, take: 1 },
        sources: true,
        investigations: {
          orderBy: { version: "desc" },
          take: 1,
          include: { evidences: { include: { source: true } }, contradictions: true },
        },
        workflowRuns: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { events: { orderBy: { createdAt: "asc" } }, _count: { select: { variants: true } } },
        },
      },
    });
  } catch { trend = null; }
  if (!trend) notFound();
  const investigation = trend.investigations[0];
  const run = trend.workflowRuns[0];
  const provider = editorialAiProvider();
  return <AppFrame active="/expedientes" title={trend.title} subtitle={`Estado: ${trend.status}`} actions={<a className="primary-button" href={`/ordenes?tema=${encodeURIComponent(trend.title)}`}>＋ Crear orden</a>}>
    {run && <WorkflowLiveControl runId={run.id} initialStatus={run.status} provider={provider} initialEvents={run.events.map((event) => ({ id: event.id, toStatus: event.toStatus, reason: event.reason, createdAt: event.createdAt.toISOString() }))}/>}
    <div className="dossier-grid">
      <section className="panel dossier-main">
        <div className="panel-head"><div><h3>Dictamen de investigación</h3><p>{investigation?.verdict ?? "Pendiente"} · Confianza {investigation?.confidence ?? 0}%</p></div><span className="badge badge-amber">Puntuación {trend.scores[0]?.total ?? "—"}</span></div>
        <div className="panel-body"><h4>Resumen</h4><p>{investigation?.summary ?? trend.description ?? "La investigación aún no ha comenzado."}</p><h4>Pregunta principal</h4><p>{investigation?.mainQuestion ?? "Pendiente"}</p><h4>Hechos respaldados</h4>{investigation?.evidences.length ? <ul className="evidence-list">{investigation.evidences.map((evidence) => <li key={evidence.id}><span>✓</span><div>{evidence.claim}<small>{evidence.source.title} · confianza {evidence.confidence}%</small></div></li>)}</ul> : <p className="muted">No hay hechos confirmados.</p>}<h4>Contradicciones</h4>{investigation?.contradictions.length ? investigation.contradictions.map((item) => <p className="warning-box" key={item.id}>{item.description}</p>) : <p className="muted">No se registraron contradicciones.</p>}</div>
      </section>
      <aside>
        <section className="panel"><div className="panel-head"><div><h3>Fuentes</h3><p>{trend.sources.length} registradas</p></div></div><div className="source-list">{trend.sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><strong>{source.title}</strong><small>{source.domain} · {source.isPrimary ? "Primaria" : "Secundaria"}</small></a>)}</div></section>
        <section className="panel trace-card"><div className="panel-head"><div><h3>Historial del flujo</h3></div></div><div className="timeline">{run?.events.map((event) => <div className="timeline-item" key={event.id}><time>{new Intl.DateTimeFormat("es-GT", { hour: "2-digit", minute: "2-digit", timeZone: "America/Guatemala" }).format(event.createdAt)}</time><i className="blue"/><div><strong>{event.toStatus}</strong><small>{event.reason}</small></div></div>)}</div></section>
      </aside>
    </div>
  </AppFrame>;
}
