import { prisma } from "@/src/db";
import { currentUser } from "@/src/auth";

const fallbackStats = [
  { label: "Tendencias detectadas", value: "12", tone: "blue", detail: "+4 desde ayer" },
  { label: "En investigación", value: "4", tone: "amber", detail: "2 requieren fuentes" },
  { label: "Borradores listos", value: "7", tone: "violet", detail: "21 versiones" },
  { label: "Aprobaciones pendientes", value: "5", tone: "green", detail: "1 de riesgo alto" },
];

const fallbackTrends = [
  { title: "Festival de barriletes anuncia nueva ruta cultural", source: "INGUAT · Cultura", score: 88, outlet: "Yo Amo Guate", risk: "Bajo" },
  { title: "Cambios temporales en rutas de Transmetro", source: "Municipalidad · Servicio", score: 82, outlet: "Trece Noticias", risk: "Medio" },
  { title: "Conversación digital por artista guatemalteco", source: "RSS · Tendencias", score: 76, outlet: "Insonimio", risk: "Medio" },
  { title: "Propuesta legislativa sobre presupuesto público", source: "Congreso · Política", score: 71, outlet: "Trece Noticias", risk: "Alto" },
];

const timeline = [
  { time: "10:42", label: "Expediente actualizado", detail: "Investigación agregó una segunda fuente independiente", color: "green" },
  { time: "10:36", label: "Cuatro versiones generadas", detail: "Núcleo factual validado: 8 de 8 hechos respaldados", color: "violet" },
  { time: "10:29", label: "Evidencia incompleta", detail: "Flujo detenido: falta una fuente primaria accesible", color: "amber" },
  { time: "10:15", label: "Tendencia puntuada", detail: "Puntuación determinista 82/100 · fórmula v1", color: "blue" },
];

function StateBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const sessionUser = await currentUser().catch(() => null);
  const displayName = sessionUser?.name ?? "Usuario demo";
  let stats = fallbackStats;
  let trends = fallbackTrends;
  try {
    const [detected, investigating, drafts, approvals, top] = await Promise.all([
      prisma.trend.count({ where: { status: "DETECTED" } }),
      prisma.trend.count({ where: { status: { in: ["INVESTIGATING", "EVIDENCE_INCOMPLETE"] } } }),
      prisma.trend.count({ where: { status: "DRAFTS_READY" } }),
      prisma.trend.count({ where: { status: "AWAITING_APPROVAL" } }),
      prisma.trend.findMany({ take: 4, orderBy: { scores: { _count: "desc" } }, include: { scores: { take: 1, orderBy: { calculatedAt: "desc" } }, suggestedOutlet: true, sources: { take: 1 } } }),
    ]);
    stats = [{ ...fallbackStats[0], value: String(detected) }, { ...fallbackStats[1], value: String(investigating) }, { ...fallbackStats[2], value: String(drafts) }, { ...fallbackStats[3], value: String(approvals) }];
    if (top.length) trends = top.map((trend) => ({ title: trend.title, source: trend.sources[0]?.title ?? trend.sourceName ?? "Entrada manual", score: trend.scores[0]?.total ?? 0, outlet: trend.suggestedOutlet?.name ?? "Por definir", risk: /política|seguridad|salud/i.test(trend.title) ? "Alto" : "Medio" }));
  } catch { /* El login puede mostrarse antes de que la base local esté lista. */ }
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">N</span><span><strong>Nexo</strong><small>Sala editorial IA</small></span></div>
        <nav aria-label="Navegación principal">
          <a className="nav-item active" href="/"><span>⌂</span>Resumen</a>
          <a className="nav-item" href="/radar"><span>⌁</span>Radar de tendencias <em>12</em></a>
          <a className="nav-item" href="/expedientes"><span>▤</span>Expedientes</a>
          <a className="nav-item" href="/ordenes"><span>＋</span>Órdenes</a>
          <a className="nav-item" href="/videos"><span>▶</span>Producción AI</a>
          <a className="nav-item" href="/aprobaciones"><span>✓</span>Aprobaciones <em>5</em></a>
          <div className="nav-label">Administración</div>
          <a className="nav-item" href="/configuracion"><span>⚙</span>Configuración</a>
          <a className="nav-item" href="/trazas"><span>⌘</span>Trazabilidad</a>
        </nav>
        <div className="sidebar-foot">
          <div className="demo-pill"><i /> Modo demostración</div>
          <div className="user-card"><span>{displayName.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><strong>{displayName}</strong><small>{sessionUser?.role.name ?? "Sin sesión"}</small></div><a href="/api/auth/logout">Salir</a></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">Sala editorial · Guatemala</p><h1>Hola, {displayName.split(" ")[0]}</h1></div>
          <div className="top-actions"><button className="icon-button" aria-label="Notificaciones">●</button><a className="primary-button" href="/radar/nueva">＋ Nueva tendencia</a></div>
        </header>

        <div className="content">
          <div className="section-heading"><div><h2>Panorama editorial</h2><p>Lo que necesita atención hoy, ordenado por prioridad.</p></div><span className="live-indicator"><i /> Datos actualizados</span></div>
          <div className="stat-grid">
            {stats.map((stat) => <article className={`stat-card tone-${stat.tone}`} key={stat.label}><div><span>{stat.label}</span><strong>{stat.value}</strong></div><small>{stat.detail}</small></article>)}
          </div>

          <div className="main-grid">
            <article className="panel trends-panel">
              <div className="panel-head"><div><h3>Radar prioritario</h3><p>Oportunidades con mayor puntuación</p></div><a href="/radar">Ver radar completo →</a></div>
              <div className="table-wrap"><table><thead><tr><th>Tema</th><th>Puntuación</th><th>Medio</th><th>Riesgo</th></tr></thead><tbody>{trends.map((trend) => <tr key={trend.title}><td><a href="/expedientes/demo">{trend.title}</a><small>{trend.source}</small></td><td><div className="score"><b>{trend.score}</b><span><i style={{ width: `${trend.score}%` }} /></span></div></td><td><StateBadge tone={trend.outlet.includes("Trece") ? "blue" : trend.outlet.includes("Amo") ? "green" : "violet"}>{trend.outlet}</StateBadge></td><td><StateBadge tone={trend.risk === "Alto" ? "red" : trend.risk === "Medio" ? "amber" : "green"}>{trend.risk}</StateBadge></td></tr>)}</tbody></table></div>
            </article>

            <article className="panel risk-panel">
              <div className="panel-head"><div><h3>Riesgo editorial</h3><p>Distribución de contenidos activos</p></div></div>
              <div className="donut" aria-label="Distribución: 46% bajo, 31% medio, 17% alto, 6% crítico"><div><strong>35</strong><span>activos</span></div></div>
              <div className="risk-legend"><span><i className="low" />Bajo <b>16</b></span><span><i className="medium" />Medio <b>11</b></span><span><i className="high" />Alto <b>6</b></span><span><i className="critical" />Crítico <b>2</b></span></div>
            </article>
          </div>

          <div className="bottom-grid">
            <article className="panel approvals-panel">
              <div className="panel-head"><div><h3>Requieren aprobación</h3><p>Decisiones humanas pendientes</p></div><a href="/aprobaciones">Abrir bandeja →</a></div>
              <div className="approval-row"><span className="priority high">ALTO</span><div><strong>Propuesta legislativa sobre presupuesto público</strong><small>Trece Noticias · Confianza 84%</small></div><time>Hace 18 min</time></div>
              <div className="approval-row"><span className="priority medium">MEDIO</span><div><strong>Conversación digital por artista guatemalteco</strong><small>Insonimio · Confianza 78%</small></div><time>Hace 42 min</time></div>
              <div className="approval-row"><span className="priority low">BAJO</span><div><strong>Festival de barriletes anuncia ruta cultural</strong><small>Yo Amo Guate · Confianza 92%</small></div><time>Hace 1 h</time></div>
            </article>

            <article className="panel activity-panel">
              <div className="panel-head"><div><h3>Actividad de agentes</h3><p>Trazabilidad del flujo en tiempo real</p></div><a href="/trazas">Ver todo →</a></div>
              <div className="timeline">{timeline.map((item) => <div className="timeline-item" key={item.time + item.label}><time>{item.time}</time><i className={item.color} /><div><strong>{item.label}</strong><small>{item.detail}</small></div></div>)}</div>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
