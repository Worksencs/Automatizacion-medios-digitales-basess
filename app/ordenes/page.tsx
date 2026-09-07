import { AppFrame, EmptyState } from "@/components/app-frame";
import { OrderCreationForm } from "@/components/order-creation-form";
import { prisma } from "@/src/db";

export const dynamic = "force-dynamic";

const orderStates: Record<string, { label: string; tone: string; action: string }> = {
  IDLE: { label: "Orden por completar", tone: "amber", action: "Completar orden" },
  RUNNING: { label: "En producción", tone: "blue", action: "Ver producción" },
  WAITING_ADMIN: { label: "Lista para aprobar", tone: "violet", action: "Revisar resultados" },
  COMPLETED: { label: "Aprobada", tone: "green", action: "Ver entrega" },
  FAILED: { label: "Requiere atención", tone: "red", action: "Resolver orden" },
  PAUSED: { label: "Pausada", tone: "amber", action: "Revisar orden" },
};

const outputLabels: Record<string, string> = {
  AUDIOVISUAL: "Producción audiovisual",
  EDITORIAL_DOCUMENT: "Documento PDF",
  SOCIAL_CARD: "Tarjeta social HTML + PNG",
};

const formatDate = (date: Date) => new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala" }).format(date);

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ tema?: string; medio?: string }> }) {
  const query = await searchParams;
  let projects: any[] = [];
  let outlets: Array<{ id: string; name: string; slug: string }> = [];
  try {
    [projects, outlets] = await Promise.all([
      prisma.videoProject.findMany({ orderBy: { updatedAt: "desc" }, include: { outlet: true, contentVariant: { include: { trend: true } }, _count: { select: { tasks: true, evidences: true } } } }),
      prisma.outlet.findMany({ where: { active: true }, select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } }),
    ]);
  } catch {}

  const counts = projects.reduce((totals, project) => {
    if (project.agentRunStatus === "IDLE") totals.pending += 1;
    if (project.agentRunStatus === "RUNNING") totals.running += 1;
    if (project.agentRunStatus === "WAITING_ADMIN") totals.review += 1;
    if (project.agentRunStatus === "COMPLETED") totals.approved += 1;
    return totals;
  }, { pending: 0, running: 0, review: 0, approved: 0 });

  return <AppFrame active="/ordenes" title="Órdenes de trabajo" subtitle="Cada producción empieza con un encargo claro, una salida definida y una imagen adjunta">
    <OrderCreationForm outlets={outlets} initialTitle={query.tema ?? ""} initialOutletSlug={query.medio ?? ""}/>

    <section className="order-flow-guide" aria-label="Flujo de una orden">
      {[{ number: "01", title: "Orden", detail: "Define qué producir, para quién y con qué imagen." }, { number: "02", title: "Producción AI", detail: "Los nueve autores trabajan simultáneamente." }, { number: "03", title: "Producto", detail: "Se construye la salida solicitada." }, { number: "04", title: "Resultados AI", detail: "Cada autor presenta su entrega final." }, { number: "05", title: "Aprobación", detail: "Administración revisa, devuelve o aprueba." }].map((step) => <article key={step.number}><span>{step.number}</span><div><strong>{step.title}</strong><small>{step.detail}</small></div></article>)}
    </section>

    <div className="order-kpis">
      <article><span>Pendientes</span><strong>{counts.pending}</strong></article>
      <article><span>En producción</span><strong>{counts.running}</strong></article>
      <article><span>Por aprobar</span><strong>{counts.review}</strong></article>
      <article><span>Aprobadas</span><strong>{counts.approved}</strong></article>
    </div>

    <div className="section-heading order-index-heading"><div><span className="eyebrow">COLA EDITORIAL</span><h2>Órdenes registradas</h2><p>Las órdenes incompletas permanecen aquí; al enviarlas pasan automáticamente a Producción AI.</p></div><a className="secondary-button" href="#new-order">＋ Nueva orden</a></div>
    {projects.length ? <div className="work-order-list">{projects.map((project) => {
      const title = project.outputKind === "SOCIAL_CARD" && project.cardBaseText?.trim() ? project.cardBaseText : project.contentVariant.headline;
      const orderComplete = Boolean(project.productionNotes?.trim() && project.productType?.trim() && project.objective?.trim() && project.audience?.trim() && project.primaryPlatform?.trim() && project.subjectImagePath);
      const orderWasRun = project.agentRunStatus !== "IDLE";
      const state = project.agentRunStatus === "IDLE" && orderComplete ? { label: "Lista para iniciar", tone: "blue", action: "Abrir orden" } : orderStates[project.agentRunStatus] ?? orderStates.IDLE;
      return <article className={`panel work-order-card order-${state.tone}`} key={project.id}>
        <div className="work-order-sequence"><span>ORDEN</span><strong>#{project.id.slice(0, 8).toUpperCase()}</strong><i /></div>
        <div className="work-order-main"><div className="work-order-meta"><span>{project.outlet.name}</span><span>{outputLabels[project.outputKind] ?? "Producto editorial"}</span><time>{formatDate(project.updatedAt)}</time></div><h3>{title}</h3><p>{project.productionNotes?.trim() || "Esta orden todavía no tiene una solicitud de producción. Ábrela para indicar exactamente qué debe crear el equipo."}</p><div className="order-requirements"><span className={orderComplete || orderWasRun ? "ok" : "pending"}>{orderWasRun ? "✓ Orden ejecutada" : orderComplete ? "✓ Brief completo" : "○ Brief pendiente"}</span><span className={project.subjectImagePath ? "ok" : "pending"}>{project.subjectImagePath ? "✓ Imagen adjunta" : orderWasRun ? "— Orden histórica sin imagen" : "○ Falta imagen"}</span><span>{project._count.tasks} autores asignados</span><span>{project._count.evidences} evidencias</span></div></div>
        <aside><span className={`badge badge-${state.tone}`}>{state.label}</span><div className="order-progress"><span><i style={{ width: `${project.progress}%` }}/></span><b>{project.progress}%</b></div><a className="primary-button" href={`/videos/${project.id}${project.agentRunStatus === "WAITING_ADMIN" ? "#agent-results" : project.agentRunStatus === "COMPLETED" ? "#product-preview" : "#production-settings"}`}>{state.action} →</a></aside>
      </article>;
    })}</div> : <EmptyState title="No hay órdenes registradas" detail="Completa el formulario superior para dejar el primer encargo al equipo AI."/>}
  </AppFrame>;
}
