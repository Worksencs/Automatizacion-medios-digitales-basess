import { AppFrame, EmptyState } from "@/components/app-frame";
import { ApprovalActions } from "@/components/approval-actions";
import { prisma } from "@/src/db";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  let runs: any[] = [];
  let productions: any[] = [];
  try {
    [runs, productions] = await Promise.all([
      prisma.workflowRun.findMany({ where: { status: "AWAITING_APPROVAL" }, include: { trend: { include: { scores: { orderBy: { calculatedAt: "desc" }, take: 1 }, sources: true, investigations: { orderBy: { version: "desc" }, take: 1, include: { contradictions: true } } } }, variants: { include: { outlet: true } }, notionSync: true, events: { orderBy: { createdAt: "asc" } } }, orderBy: { updatedAt: "asc" } }),
      prisma.videoProject.findMany({ where: { agentRunStatus: "WAITING_ADMIN" }, include: { outlet: true, contentVariant: { include: { trend: true } }, tasks: { orderBy: { order: "asc" } }, _count: { select: { evidences: true } } }, orderBy: { updatedAt: "asc" } }),
    ]);
  } catch {}

  return <AppFrame active="/aprobaciones" title="Aprobaciones" subtitle="Último punto del flujo: el equipo AI entrega y Administración conserva la decisión final">
    {productions.length > 0 && <section className="production-approval-section"><div className="section-heading"><div><span className="eyebrow">04 · PAQUETES TERMINADOS</span><h2>Producciones que esperan tu decisión</h2><p>Abre la sala para ver el producto y el resultado final de cada AI antes de aprobar.</p></div><span className="approval-count">{productions.length} pendiente{productions.length === 1 ? "" : "s"}</span></div><div className="production-approval-grid">{productions.map((project) => {
      const done = project.tasks.filter((task: any) => task.status === "DONE").length;
      const title = project.outputKind === "SOCIAL_CARD" && project.cardBaseText?.trim() ? project.cardBaseText : project.contentVariant.headline;
      return <a className={`panel production-approval-card outlet-${project.outlet.slug}`} href={`/videos/${project.id}#approval`} key={project.id}><header><span className="badge badge-violet">Decisión requerida</span><small>{project.outlet.name}</small></header><h3>{title}</h3><p>{project.productionNotes}</p><div><span><b>{done}/{project.tasks.length}</b> resultados AI</span><span><b>{project._count.evidences}</b> evidencias</span><strong>Revisar paquete →</strong></div></a>;
    })}</div></section>}

    {runs.length > 0 && <section><div className="section-heading approval-editorial-heading"><div><span className="eyebrow">APROBACIÓN EDITORIAL</span><h2>Versiones editoriales pendientes</h2><p>Decisiones anteriores a la creación de una orden de producción.</p></div></div><div className="approval-queue">{runs.map((run) => {
      const risk = run.variants.reduce((max: string, variant: any) => ["LOW", "MEDIUM", "HIGH", "CRITICAL"].indexOf(variant.riskLevel) > ["LOW", "MEDIUM", "HIGH", "CRITICAL"].indexOf(max) ? variant.riskLevel : max, "LOW");
      const dossier = run.trend.investigations[0];
      return <article className="panel approval-card" key={run.id}><div className="approval-summary"><span className={`priority ${risk === "HIGH" ? "high" : risk === "MEDIUM" ? "medium" : "low"}`}>{risk}</span><div><h3>{run.trend.title}</h3><p>Puntuación {run.trend.scores[0]?.total ?? "—"} · Confianza {dossier?.confidence ?? "—"}% · {run.trend.sources.length} fuentes</p></div><span className="badge badge-blue">Notion: {run.notionSync?.status ?? "PENDING"}</span></div>{dossier?.contradictions.length > 0 && <div className="warning-box">{dossier.contradictions.map((item: any) => item.description).join(" · ")}</div>}<details><summary>Revisar las cuatro versiones</summary><div className="approval-variants">{run.variants.map((variant: any) => <section key={variant.id}><h4>{variant.outlet.name}</h4><strong>{variant.headline}</strong><p>{variant.body}</p></section>)}</div></details><ApprovalActions workflowRunId={run.id} risk={risk}/></article>;
    })}</div></section>}

    {!productions.length && !runs.length && <EmptyState title="La bandeja está al día" detail="No hay producciones ni contenidos editoriales pendientes de decisión humana." />}
  </AppFrame>;
}
