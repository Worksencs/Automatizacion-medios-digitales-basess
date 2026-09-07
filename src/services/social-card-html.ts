import { isInsomnioOutlet } from "@/src/domain/insomnio-social-template";

type SocialCardInput = {
  outlet: string;
  headline: string;
  hook: string;
  productType: string;
  platform: string;
  aspectRatio: string;
  objective: string;
  progress: number;
  approved: boolean;
  subjectImageDataUrl?: string | null;
  breakingBadge?: "NONE" | "BREAKING" | "URGENT" | string | null;
  colorCopy?: { base: string; accent: string; impact: string; question: string };
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character] ?? character);
}

function dimensions(aspectRatio: string) {
  if (aspectRatio === "9:16") return { width: 1080, height: 1920 };
  if (aspectRatio === "4:5") return { width: 1080, height: 1350 };
  if (aspectRatio === "16:9") return { width: 1920, height: 1080 };
  return { width: 1080, height: 1080 };
}

export function extractSocialCardCopy(deliverable: string | null | undefined, fallback: { headline: string; hook: string }) {
  if (!deliverable) return fallback;
  const normalized = deliverable.replace(/\s+/g, " ").trim();
  const headline = normalized.match(/Titular(?:\s*\([^)]*\))?\s*:\s*(.+?)(?=\s+Bajada(?:\s*\(|\s*:))/i)?.[1]?.trim();
  const hook = normalized.match(/Bajada(?:\s*\([^)]*\))?\s*:\s*(.+?)(?=\s+(?:Marca|Pie|Alt-text|HTML\/CSS|Recursos autorizados|Bloqueos)\s*:)/i)?.[1]?.trim();
  return { headline: headline || fallback.headline, hook: hook || fallback.hook };
}

export function extractSocialCardColorCopy(deliverable: string | null | undefined, fallback: { headline: string; hook: string }) {
  const baseCopy = extractSocialCardCopy(deliverable, fallback);
  const normalized = deliverable?.replace(/\s+/g, " ").trim() ?? "";
  const fieldLabels = "Blanco|Amarillo|Verde|Pregunta|Jerarquía|HTML\\/CSS|Recursos(?: autorizados)?|Bloqueos|Logo|Fuentes|Estado|Nota|Contraste";
  const capture = (label: string) => normalized.match(new RegExp(`${label}\\s*:\\s*(.+?)(?=\\s+(?:${fieldLabels})\\s*:|$)`, "i"))?.[1]?.trim() ?? "";
  const rawQuestion = capture("Pregunta");
  return {
    base: capture("Blanco") || baseCopy.headline,
    accent: capture("Amarillo") || baseCopy.hook,
    impact: capture("Verde"),
    question: rawQuestion.match(/^.*?\?/)?.[0] ?? rawQuestion,
  };
}

export function buildSocialCardHtml(input: SocialCardInput) {
  const size = dimensions(input.aspectRatio);
  const status = input.approved ? "APROBADA POR ADMINISTRACIÓN" : "BORRADOR · REVISIÓN HUMANA";
  if (isInsomnioOutlet(input.outlet)) {
    const copy = input.colorCopy ?? extractSocialCardColorCopy(null, { headline: input.headline, hook: input.hook });
    const copyLength = copy.base.length + copy.accent.length + copy.impact.length + copy.question.length;
    const copySize = copyLength > 250 ? 4.1 : copyLength > 180 ? 4.7 : copyLength > 120 ? 5.4 : 6.2;
    const badge = input.breakingBadge === "BREAKING" ? "ÚLTIMO MOMENTO" : input.breakingBadge === "URGENT" ? "URGENTE | GUATEMALA" : "";
    const image = input.subjectImageDataUrl
      ? `<img src="${escapeHtml(input.subjectImageDataUrl)}" alt="Imagen principal proporcionada y autorizada por el usuario">`
      : `<span>ADJUNTA LA IMAGEN PRINCIPAL<br><small>SUBJECT 1 · ORIGINAL SIN ALTERAR</small></span>`;
    const css = `
*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:"Arial Narrow",Inter,Arial,sans-serif;background:#111;color:#fff}body{display:grid;place-items:center;padding:32px}.workspace{display:grid;gap:18px;justify-items:center}.toolbar{width:min(92vw,540px);display:flex;align-items:center;justify-content:space-between;gap:16px;color:#b9c0ca;font:700 13px Inter,Arial,sans-serif}.toolbar button{border:0;border-radius:8px;padding:11px 15px;background:#facc15;color:#000;font-weight:900;cursor:pointer}.news-card{--copy-size:${copySize}cqw;container-type:inline-size;position:relative;width:min(92vw,540px);aspect-ratio:${size.width}/${size.height};overflow:hidden;background:#000;box-shadow:0 26px 80px #0009}.news-card.exporting{width:${size.width}px;height:${size.height}px}.subject{position:absolute;inset:0 0 38% 0;display:grid;place-items:center;overflow:hidden;background:#151515}.subject img{width:100%;height:100%;display:block;object-fit:contain;object-position:center;background:#0b0b0b;filter:none}.subject>span{color:#69717d;font:900 25px/1.35 Inter,Arial,sans-serif;text-align:center;letter-spacing:.08em}.subject small{font-size:13px}.brand-lockup{position:absolute;z-index:3;left:4%;top:2.6%;display:flex;align-items:center;gap:12px}.brand-mark{position:relative;width:70px;height:86px;background:#fff;color:#071a31;text-align:center}.brand-i{position:relative;display:block;height:58px;font:950 65px/.9 Arial,sans-serif}.brand-i:after{content:"";position:absolute;left:23px;top:25px;width:30px;height:8px;background:#fff;transform:rotate(-42deg)}.brand-mark em{display:block;margin-top:-2px;font:italic 700 13px/1 cursive}.brand-copy{color:#fff;text-shadow:0 1px 8px #000}.brand-copy b,.brand-copy small{display:block}.brand-copy b{font:900 15px/1 Inter,Arial,sans-serif;letter-spacing:.04em}.brand-copy small{margin-top:6px;font:600 9px/1.2 Inter,Arial,sans-serif}.breaking{position:absolute;z-index:3;right:4%;top:3%;padding:10px 13px;background:#d81920;color:#fff;font:950 12px/1 Inter,Arial,sans-serif;letter-spacing:.04em}.copy{position:absolute;inset:62% 0 0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4% 7%;overflow:hidden;background:#000;text-align:center}.copy h1{width:100%;margin:0;font-size:var(--copy-size);font-weight:950;line-height:.94;letter-spacing:-.035em;text-wrap:balance}.copy h1 span{display:block}.base{color:#fff}.accent,.question{color:#facc15}.impact{color:#4ade4a}.question{margin-top:.12em}.status-note{width:min(92vw,540px);color:#8f98a5;font:800 11px Inter,Arial,sans-serif;text-align:center;letter-spacing:.06em}@media(max-width:620px){body{padding:14px}.toolbar{align-items:stretch;flex-direction:column}.toolbar button{width:100%}.brand-mark{width:50px;height:63px}.brand-i{height:43px;font-size:48px}.brand-i:after{left:16px;top:18px;width:24px;height:6px}.brand-mark em{font-size:10px}.brand-copy b{font-size:10px}.brand-copy small{font-size:7px}.breaking{font-size:8px;padding:8px}}`;
    return `<!doctype html>
<html lang="es-GT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.productType)} · Insomnio Guatemala</title><style>${css}</style></head>
<body><main class="workspace"><div class="toolbar"><span>Plantilla maestra · ${size.width} × ${size.height} · ${escapeHtml(input.platform)}</span><button id="download" type="button">Exportar PNG</button></div>
<article class="news-card" id="card" aria-label="Tarjeta vertical de Insomnio Guatemala">
  <section class="subject">${image}</section>
  <div class="brand-lockup"><div class="brand-mark"><b class="brand-i">i</b><em>Guatemala</em></div><div class="brand-copy"><b>INSOMNIO GUATEMALA</b><small>El dato que no te deja dormir</small></div></div>
  ${badge ? `<div class="breaking">${badge}</div>` : ""}
  <section class="copy"><h1 contenteditable="true"><span class="base">${escapeHtml(copy.base)}</span><span class="accent">${escapeHtml(copy.accent)}</span>${copy.impact ? `<span class="impact">${escapeHtml(copy.impact)}</span>` : ""}${copy.question ? `<span class="question">${escapeHtml(copy.question)}</span>` : ""}</h1></section>
</article><div class="status-note">${status} · ${input.progress}% · IMAGEN ORIGINAL SIN ALTERAR</div></main>
<script>
document.getElementById("download").addEventListener("click",async()=>{const card=document.getElementById("card");const clone=card.cloneNode(true);clone.classList.add("exporting");const markup='<div xmlns="http://www.w3.org/1999/xhtml"><style>${css.replace(/<\/style/gi, "<\\/style")}</style>'+clone.outerHTML+'</div>';const svg='<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}"><foreignObject width="100%" height="100%">'+markup+'</foreignObject></svg>';const image=new Image();image.onload=()=>{const canvas=document.createElement("canvas");canvas.width=${size.width};canvas.height=${size.height};canvas.getContext("2d").drawImage(image,0,0);URL.revokeObjectURL(image.src);const link=document.createElement("a");link.download="insomnio-guatemala-${input.aspectRatio.replace(":", "x")}.png";link.href=canvas.toDataURL("image/png");link.click()};image.src=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml;charset=utf-8"}))});
</script></body></html>`;
  }
  const css = `
*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:Inter,Arial,sans-serif;background:#101318;color:#fff}body{display:grid;place-items:center;padding:32px}.workspace{display:grid;gap:18px;justify-items:center}.toolbar{width:min(92vw,760px);display:flex;align-items:center;justify-content:space-between;gap:16px;color:#aeb7c5;font-size:13px}.toolbar button{border:0;border-radius:9px;padding:11px 15px;background:#ffe000;color:#111;font-weight:900;cursor:pointer}.news-card{--w:${size.width};--h:${size.height};position:relative;width:min(92vw,760px);aspect-ratio:${size.width}/${size.height};overflow:hidden;background:#050505;box-shadow:0 26px 80px #0008}.news-card.exporting{width:${size.width}px;height:${size.height}px}.visuals{height:58%;display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#ffe000}.visual{position:relative;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 70% 28%,#57677d,transparent 24%),linear-gradient(145deg,#2b3542,#111821 58%,#394554)}.visual:nth-child(2){background:radial-gradient(circle at 38% 34%,#7b8797,transparent 18%),linear-gradient(160deg,#161b23,#303b48 68%,#12161c)}.visual:after{content:"";position:absolute;inset:8%;border:2px dashed #ffffff40;border-radius:50%}.visual span{position:relative;z-index:1;padding:9px 13px;border:1px solid #ffffff30;border-radius:7px;background:#0b1018bb;font-size:12px;font-weight:900;letter-spacing:.08em}.brand{position:absolute;z-index:3;left:3.2%;top:3.2%;width:15%;min-width:94px;padding:14px 10px;background:#fff;color:#071424;text-align:center;box-shadow:0 8px 24px #0005}.brand b{display:block;font-size:clamp(18px,3.8vw,46px);line-height:.9}.brand small{display:block;margin-top:8px;font-size:clamp(5px,.8vw,10px);font-weight:900;letter-spacing:.07em}.copy{height:42%;display:flex;flex-direction:column;justify-content:center;padding:5.2% 7% 4.5%;background:#030303}.kicker{margin-bottom:2%;color:#ffe000;font-size:clamp(8px,1.2vw,16px);font-weight:900;letter-spacing:.16em;text-transform:uppercase}.copy h1{margin:0;color:#ffe000;font-size:clamp(24px,4.9vw,62px);line-height:1.02;letter-spacing:-.045em;text-align:center}.copy p{margin:2.2% 0 0;color:#fff;font-size:clamp(12px,2vw,25px);font-weight:750;line-height:1.15;text-align:center}.footer{position:absolute;left:3%;right:3%;bottom:1.6%;display:flex;justify-content:space-between;color:#9ba3ad;font-size:clamp(6px,.75vw,10px);font-weight:800;letter-spacing:.08em;text-transform:uppercase}.status{color:#ffe000}@media(max-width:620px){body{padding:14px}.toolbar{align-items:stretch;flex-direction:column}.toolbar button{width:100%}.visuals{gap:4px}.brand{min-width:68px;padding:9px 7px}.visual span{font-size:8px}.copy{padding-inline:5%}}`;
  return `<!doctype html>
<html lang="es-GT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.productType)} · ${escapeHtml(input.outlet)}</title><style>${css}</style></head>
<body><main class="workspace"><div class="toolbar"><span>HTML editable · ${size.width} × ${size.height} · ${escapeHtml(input.platform)}</span><button id="download" type="button">Exportar PNG</button></div>
<article class="news-card" id="card" aria-label="Tarjeta gráfica informativa">
  <section class="visuals"><div class="visual"><span>IMAGEN AUTORIZADA 01</span></div><div class="visual"><span>IMAGEN AUTORIZADA 02</span></div></section>
  <div class="brand"><b>${escapeHtml(input.outlet)}</b><small>MEDIO INFORMATIVO</small></div>
  <section class="copy"><span class="kicker">${escapeHtml(input.productType)} · CONTENIDO EN REVISIÓN</span><h1 contenteditable="true">${escapeHtml(input.headline)}</h1><p contenteditable="true">${escapeHtml(input.hook)}</p></section>
  <footer class="footer"><span>${escapeHtml(input.objective)}</span><span class="status">${status} · ${input.progress}%</span></footer>
</article></main>
<script>
document.getElementById("download").addEventListener("click",async()=>{const card=document.getElementById("card");const clone=card.cloneNode(true);clone.classList.add("exporting");const markup='<div xmlns="http://www.w3.org/1999/xhtml"><style>${css.replace(/<\/style/gi, "<\\/style")}</style>'+clone.outerHTML+'</div>';const svg='<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}"><foreignObject width="100%" height="100%">'+markup+'</foreignObject></svg>';const image=new Image();image.onload=()=>{const canvas=document.createElement("canvas");canvas.width=${size.width};canvas.height=${size.height};canvas.getContext("2d").drawImage(image,0,0);URL.revokeObjectURL(image.src);const link=document.createElement("a");link.download="tarjeta-${escapeHtml(input.outlet.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}.png";link.href=canvas.toDataURL("image/png");link.click()};image.src=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml;charset=utf-8"}))});
</script></body></html>`;
}
