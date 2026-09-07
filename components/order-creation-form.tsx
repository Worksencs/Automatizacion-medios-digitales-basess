"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type OutputKind = "AUDIOVISUAL" | "EDITORIAL_DOCUMENT" | "SOCIAL_CARD";
type Outlet = { id: string; name: string; slug: string };

const productOptions: Record<OutputKind, string[]> = {
  SOCIAL_CARD: ["Tarjeta informativa", "Última hora", "Comparativa visual", "Dato destacado"],
  EDITORIAL_DOCUMENT: ["Nota periodística", "Reportaje", "Boletín informativo", "Informe de investigación"],
  AUDIOVISUAL: ["Video explicativo de servicio", "Reel / Short vertical", "Boletín audiovisual", "Historia vertical", "Paquete multiplataforma"],
};

const platformOptions: Record<Exclude<OutputKind, "EDITORIAL_DOCUMENT">, string[]> = {
  SOCIAL_CARD: ["Instagram Feed", "Instagram Story / Reel", "Facebook Feed", "Facebook Story / Reel", "TikTok", "YouTube Shorts", "X / Threads", "Multiplataforma"],
  AUDIOVISUAL: ["Instagram", "TikTok", "YouTube", "Facebook", "Sitio web / TV", "Multiplataforma"],
};

function defaultsFor(outputKind: OutputKind) {
  if (outputKind === "EDITORIAL_DOCUMENT") return { productType: productOptions.EDITORIAL_DOCUMENT[0], primaryPlatform: "Documento PDF", aspectRatio: "4:5" };
  if (outputKind === "AUDIOVISUAL") return { productType: productOptions.AUDIOVISUAL[0], primaryPlatform: "YouTube", aspectRatio: "16:9" };
  return { productType: productOptions.SOCIAL_CARD[0], primaryPlatform: "Instagram Feed", aspectRatio: "4:5" };
}

export function OrderCreationForm({ outlets, initialTitle = "", initialOutletSlug = "" }: { outlets: Outlet[]; initialTitle?: string; initialOutletSlug?: string }) {
  const router = useRouter();
  const [outputKind, setOutputKind] = useState<OutputKind>("SOCIAL_CARD");
  const [productType, setProductType] = useState(productOptions.SOCIAL_CARD[0]);
  const [primaryPlatform, setPrimaryPlatform] = useState("Instagram Feed");
  const [aspectRatio, setAspectRatio] = useState("4:5");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  function changeKind(nextKind: OutputKind) {
    const defaults = defaultsFor(nextKind);
    setOutputKind(nextKind);
    setProductType(defaults.productType);
    setPrimaryPlatform(defaults.primaryPlatform);
    setAspectRatio(defaults.aspectRatio);
  }

  function changePlatform(platform: string) {
    setPrimaryPlatform(platform);
    if (outputKind !== "SOCIAL_CARD") return;
    if (/story|reel|tiktok|short/i.test(platform)) setAspectRatio("9:16");
    else if (/facebook feed/i.test(platform)) setAspectRatio("1:1");
    else setAspectRatio("4:5");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("Registrando la orden…"); setCreatedProjectId(null);
    const form = new FormData(event.currentTarget);
    const image = form.get("image");
    try {
      if (!(image instanceof File) || image.size === 0) throw new Error("Adjunta la imagen que utilizará el equipo.");
      const payload = {
        title: String(form.get("title") ?? ""), outletId: String(form.get("outletId") ?? ""), productionNotes: String(form.get("productionNotes") ?? ""),
        outputKind, productType, objective: String(form.get("objective") ?? ""), audience: String(form.get("audience") ?? ""), primaryPlatform,
        durationSeconds: outputKind === "AUDIOVISUAL" ? Number(form.get("durationSeconds") ?? 60) : undefined, aspectRatio: outputKind === "EDITORIAL_DOCUMENT" ? undefined : aspectRatio,
        pageSize: outputKind === "EDITORIAL_DOCUMENT" ? String(form.get("pageSize") ?? "Carta") : undefined,
        documentStyle: outputKind === "EDITORIAL_DOCUMENT" ? String(form.get("documentStyle") ?? "Nota informativa") : undefined,
        sourceUrl: String(form.get("sourceUrl") ?? ""), sourceName: String(form.get("sourceName") ?? ""), isFictional: form.get("isFictional") === "on",
      };
      const response = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo registrar la orden.");
      const projectId = data.project.id as string;
      setCreatedProjectId(projectId);
      setMessage("Orden registrada. Adjuntando y analizando la imagen…");
      const imageForm = new FormData();
      imageForm.append("image", image);
      imageForm.append("productionNotes", payload.productionNotes);
      imageForm.append("objective", payload.objective);
      imageForm.append("audience", payload.audience);
      const imageResponse = await fetch(`/api/videos/${projectId}/subject-image`, { method: "POST", body: imageForm });
      const imageData = await imageResponse.json();
      if (!imageResponse.ok) throw new Error(`La orden se registró, pero la imagen no pudo adjuntarse: ${imageData.error ?? "error desconocido"}`);
      setMessage("Orden lista. Abriendo la sala para tu revisión…");
      router.push(`/videos/${projectId}#production-settings`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar la orden.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="panel new-order-panel" id="new-order">
    <header><div><span className="new-order-number">01</span><div><span className="eyebrow">NUEVA ORDEN</span><h2>¿Qué debe producir el equipo?</h2><p>Registra el encargo y su material visual. Todavía no iniciaremos las AI: primero podrás revisar la orden en su sala.</p></div></div><span className="order-required-note">Imagen obligatoria</span></header>
    <form className="new-order-form" onSubmit={submit}>
      <label className="order-title-field">Título o tema de la orden<input name="title" defaultValue={initialTitle} required minLength={5} maxLength={240} placeholder="Ej.: Preparar una tarjeta sobre…"/></label>
      <label>Medio<select name="outletId" defaultValue={outlets.find((outlet) => outlet.slug === initialOutletSlug)?.id ?? outlets[0]?.id ?? ""} required>{outlets.map((outlet) => <option value={outlet.id} key={outlet.id}>{outlet.name}</option>)}</select></label>
      <label>Naturaleza del producto<select value={outputKind} onChange={(event) => changeKind(event.target.value as OutputKind)}><option value="SOCIAL_CARD">Tarjeta gráfica social</option><option value="EDITORIAL_DOCUMENT">Documento editorial / PDF</option><option value="AUDIOVISUAL">Audiovisual</option></select></label>
      <label>Producto<select value={productType} onChange={(event) => setProductType(event.target.value)}>{productOptions[outputKind].map((option) => <option key={option}>{option}</option>)}</select></label>
      <label>Plataforma de salida{outputKind === "EDITORIAL_DOCUMENT" ? <input value="Documento PDF" disabled/> : <select value={primaryPlatform} onChange={(event) => changePlatform(event.target.value)}>{platformOptions[outputKind].map((option) => <option key={option}>{option}</option>)}</select>}</label>
      <label>Formato{outputKind === "EDITORIAL_DOCUMENT" ? <select name="pageSize" defaultValue="Carta"><option>Carta</option><option>A4</option></select> : <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}><option>16:9</option><option>9:16</option>{outputKind === "SOCIAL_CARD" && <option>4:5</option>}<option>1:1</option></select>}</label>
      {outputKind === "EDITORIAL_DOCUMENT" && <label>Estilo editorial<select name="documentStyle" defaultValue="Nota informativa"><option>Nota informativa</option><option>Reportaje</option><option>Boletín</option><option>Informe editorial</option></select></label>}
      {outputKind === "AUDIOVISUAL" && <label>Duración objetivo<div className="input-suffix"><input name="durationSeconds" type="number" min={10} max={3600} defaultValue={60} required/><span>segundos</span></div></label>}
      <label className="order-request-field">Orden principal<textarea name="productionNotes" rows={4} required minLength={10} maxLength={1000} placeholder="Indica qué debe hacerse, qué información debe buscarse, qué tono usar y qué resultado esperas."/><span>Esta orden llegará sin cambios a los nueve autores AI.</span></label>
      <label>Objetivo<input name="objective" required minLength={5} maxLength={500} placeholder="Qué debe comprender o hacer la audiencia"/></label>
      <label>Audiencia<input name="audience" required minLength={3} maxLength={200} placeholder="A quién va dirigido"/></label>
      <label>Fuente o enlace inicial<input name="sourceUrl" type="url" maxLength={2000} placeholder="https://… (opcional)"/></label>
      <label>Nombre de la fuente<input name="sourceName" maxLength={160} placeholder="Medio, institución o persona"/></label>
      <label className="order-image-field">Imagen principal para el equipo<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required/><span>JPG, PNG o WEBP · máximo 8 MB. Ojo AI la analizará y todos los autores podrán consultarla.</span></label>
      <label className="order-fictional-check"><input name="isFictional" type="checkbox"/><span>Marcar esta orden como ejercicio o contenido ficticio</span></label>
      <div className="new-order-actions"><span>{message || "La orden quedará pendiente hasta que pulses “Enviar solicitud y comenzar” dentro de su sala."}{createdProjectId && message.includes("imagen no pudo") && <> <a href={`/videos/${createdProjectId}#production-settings`}>Abrir la orden creada →</a></>}</span><button className="primary-button" type="submit" disabled={busy || outlets.length === 0}>{busy ? "Registrando orden…" : "Registrar orden →"}</button></div>
    </form>
  </section>;
}
