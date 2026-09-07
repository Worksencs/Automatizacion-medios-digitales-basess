import { notFound } from "next/navigation";
import { AppFrame } from "@/components/app-frame";
import { VideoAgentCommandCenter } from "@/components/video-agent-command-center";
import { currentUser } from "@/src/auth";
import { prisma } from "@/src/db";
import { videoStageLabels, type VideoStageCode } from "@/src/domain/video-production";
import { parseSubjectImageAnalysis } from "@/src/domain/subject-image-analysis";
import { productionAiProvider } from "@/src/services/video-agent-team";

export const dynamic = "force-dynamic";
const evidenceLabels: Record<string, string> = { NOTE: "Nota", LINK: "Enlace", CHECKLIST: "Lista de control", FILE_REFERENCE: "Entregable", STATUS_CHANGE: "Cambio de estado" };
const formatDate = (date: Date) => new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala" }).format(date);

export default async function VideoProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, user] = await Promise.all([
    prisma.videoProject.findUnique({ where: { id }, include: {
      outlet: true, contentVariant: { include: { trend: true } },
      tasks: { orderBy: { order: "asc" } },
      evidences: { include: { author: true, task: true }, orderBy: { createdAt: "desc" }, take: 40 },
      comments: { include: { author: { include: { role: true } } }, orderBy: { createdAt: "asc" } },
      agentActivities: { orderBy: { createdAt: "desc" }, take: 80 },
    } }),
    currentUser(),
  ]);
  if (!project) notFound();
  const admin = user ? { name: user.name, roleCode: user.role.code } : { name: "Sin sesión", roleCode: "LECTOR" };
  const mode = productionAiProvider();
  const displayHeadline = project.outputKind === "SOCIAL_CARD" && project.cardBaseText?.trim() ? project.cardBaseText : project.contentVariant.headline;
  const displayHook = project.outputKind === "SOCIAL_CARD" && project.cardAccentText?.trim() ? project.cardAccentText : project.contentVariant.hook;
  const isOrder = project.agentRunStatus === "IDLE";
  return <AppFrame active={isOrder ? "/ordenes" : "/videos"} title={project.outlet.name} subtitle={project.outputKind === "SOCIAL_CARD" ? displayHeadline : project.contentVariant.trend.title} actions={<a className="secondary-button" href={isOrder ? "/ordenes" : "/videos"}>← {isOrder ? "Todas las órdenes" : "Todas las producciones"}</a>}>
    <section className={`panel video-hero outlet-${project.outlet.slug}`}><div><span className="eyebrow">{isOrder ? "Orden editorial" : "Sala de control editorial"}</span><h2>{displayHeadline}</h2><p>{displayHook}</p></div><div className="video-hero-progress"><strong>{project.progress}%</strong><span>{isOrder ? "Orden" : videoStageLabels[project.currentStage as VideoStageCode]}</span></div><div className="video-progress wide"><span><i style={{ width: `${project.progress}%` }}/></span></div></section>

    <VideoAgentCommandCenter projectId={project.id} project={{ outlet: project.outlet.name, headline: displayHeadline, hook: displayHook }} mode={mode} admin={admin} initialRunStatus={project.agentRunStatus} initialProgress={project.progress} initialBrief={{ outputKind: (project.outputKind as "AUDIOVISUAL" | "EDITORIAL_DOCUMENT" | "SOCIAL_CARD") ?? "AUDIOVISUAL", productType: project.productType ?? "", objective: project.objective ?? "", audience: project.audience ?? "", durationSeconds: project.durationSeconds ?? 60, primaryPlatform: project.primaryPlatform ?? "", productionNotes: project.productionNotes ?? "", aspectRatio: (project.aspectRatio as "16:9" | "9:16" | "4:5" | "1:1") ?? "16:9", resolution: (project.resolution as "1080p" | "4K") ?? "1080p", captionStyle: (project.captionStyle as "Informativos" | "Dinámicos" | "Sin subtítulos") ?? "Informativos", voiceStyle: (project.voiceStyle as "Informativa" | "Cálida" | "Enérgica") ?? "Informativa", pageSize: (project.pageSize as "Carta" | "A4") ?? "Carta", documentStyle: (project.documentStyle as "Nota informativa" | "Reportaje" | "Boletín" | "Informe editorial") ?? "Nota informativa", subjectImagePath: project.subjectImagePath, subjectImageName: project.subjectImageName, subjectImageMime: project.subjectImageMime, subjectImageAnalysis: parseSubjectImageAnalysis(project.subjectImageAnalysis), breakingBadge: (project.breakingBadge as "NONE" | "BREAKING" | "URGENT") ?? "NONE", cardBaseText: project.cardBaseText ?? "", cardAccentText: project.cardAccentText ?? "", cardImpactText: project.cardImpactText ?? "", cardQuestion: project.cardQuestion ?? "" }} initialTasks={project.tasks.map((task) => ({ id: task.id, order: task.order, title: task.title, description: task.description, stage: task.stage, status: task.status, deliverable: task.deliverable, agentKey: task.agentKey, agentName: task.agentName }))} initialActivities={project.agentActivities.map((activity) => ({ ...activity, createdAt: activity.createdAt.toISOString() }))}/>

    <div className="command-grid audit-grid"><article className="panel"><div className="panel-head"><div><h3>Bitácora de entregas</h3><p>{project.evidences.length} evidencias recientes, firmadas por humano o agente AI.</p></div></div><div className="video-timeline">{project.evidences.map((evidence) => <div key={evidence.id}><i/><div><span>{evidenceLabels[evidence.type]}{evidence.task ? ` · ${evidence.task.title}` : ""}</span><strong>{evidence.title}</strong><p>{evidence.description}</p>{evidence.url && <a href={evidence.url} target="_blank" rel="noreferrer">Abrir evidencia ↗</a>}<small>{evidence.agentName ? `${evidence.agentName} · Autor AI` : evidence.author?.name ?? "Sistema"} · {formatDate(evidence.createdAt)}</small></div></div>)}</div></article>
    <article className="panel video-comments"><div className="panel-head"><div><h3>Notas del administrador</h3><p>Observaciones humanas separadas de las entregas AI.</p></div></div><div>{project.comments.map((comment) => <section key={comment.id}><strong>{comment.author.name}</strong><span>{comment.author.role.name} · {formatDate(comment.createdAt)}</span><p>{comment.body}</p></section>)}</div><form action={`/api/videos/${project.id}/comments`} method="post"><textarea name="body" required minLength={2} rows={3} placeholder="Deja una observación o punto crítico…"/><button className="secondary-button" type="submit">Registrar nota</button></form></article></div>
  </AppFrame>;
}
