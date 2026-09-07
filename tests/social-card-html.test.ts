import { describe, expect, it } from "vitest";
import { buildSocialCardHtml, extractSocialCardColorCopy, extractSocialCardCopy } from "@/src/services/social-card-html";

describe("tarjeta gráfica HTML", () => {
  it("genera una pieza editable con exportación PNG", () => {
    const html = buildSocialCardHtml({
      outlet: "Insonomio Guatemala",
      headline: "Cambio de horarios en una ruta urbana",
      hook: "Qué debe comprobar la audiencia antes de viajar.",
      productType: "Tarjeta informativa",
      platform: "Instagram",
      aspectRatio: "1:1",
      objective: "Informar con claridad",
      progress: 100,
      approved: false,
    });
    expect(html).toContain("Exportar PNG");
    expect(html).toContain("contenteditable=\"true\"");
    expect(html).toContain("1080");
    expect(html).toContain("REVISIÓN HUMANA");
  });

  it("escapa el contenido editorial antes de insertarlo", () => {
    const html = buildSocialCardHtml({ outlet: "Medio", headline: "<script>alert(1)</script>", hook: "Texto", productType: "Tarjeta", platform: "Web", aspectRatio: "1:1", objective: "Informar", progress: 10, approved: false });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("aplica el titular y la bajada escritos por el agente", () => {
    expect(extractSocialCardCopy("Titular (#FFD100): Cambio confirmado Bajada (blanco): Verificá antes de salir. Marca: Medio", { headline: "Original", hook: "Original" })).toEqual({ headline: "Cambio confirmado", hook: "Verificá antes de salir." });
  });

  it("aplica la plantilla maestra vertical y conserva la imagen adjunta", () => {
    const html = buildSocialCardHtml({ outlet: "Insonimio Guatemala", headline: "El hecho base", hook: "El giro inesperado", productType: "Tarjeta informativa", platform: "Instagram", aspectRatio: "9:16", objective: "Informar", progress: 100, approved: false, subjectImageDataUrl: "data:image/png;base64,AAAA", breakingBadge: "URGENT" });
    expect(html).toContain("1080 × 1920");
    expect(html).toContain("data:image/png;base64,AAAA");
    expect(html).toContain("object-fit:contain");
    expect(html).toContain("URGENTE | GUATEMALA");
    expect(html).toContain("El dato que no te deja dormir");
  });

  it("exporta la plantilla de Feed en 1080 por 1350 sin fijarla a 9:16", () => {
    const html = buildSocialCardHtml({ outlet: "Insomnio Guatemala", headline: "La superficie de la Luna", hook: "está cubierta de cráteres", productType: "Dato destacado", platform: "Instagram Feed", aspectRatio: "4:5", objective: "Informar", progress: 100, approved: false, subjectImageDataUrl: "data:image/jpeg;base64,AAAA", colorCopy: { base: "La superficie de la Luna", accent: "está cubierta de cráteres", impact: "", question: "¿Qué historia guardan?" } });
    expect(html).toContain("1080 × 1350");
    expect(html).toContain("aspect-ratio:1080/1350");
    expect(html).toContain("canvas.height=1350");
    expect(html).not.toContain("-webkit-line-clamp");
  });

  it("separa el texto por el sistema fijo de color", () => {
    expect(extractSocialCardColorCopy("Blanco: Hallazgo en Guatemala Amarillo: nadie lo esperaba Verde: ocurrió a medianoche Pregunta: ¿Qué harías?", { headline: "Base", hook: "Giro" })).toEqual({ base: "Hallazgo en Guatemala", accent: "nadie lo esperaba", impact: "ocurrió a medianoche", question: "¿Qué harías?" });
  });

  it("detiene la pregunta antes de las notas técnicas del diseñador", () => {
    expect(extractSocialCardColorCopy("Blanco: La misión observa la Luna Amarillo: una señal aparece Verde: el dato sorprende Pregunta: ¿Qué encontró la cámara? Jerarquía: blanco 92 px, amarillo 78 px HTML/CSS: composición vertical", { headline: "Base", hook: "Giro" })).toEqual({ base: "La misión observa la Luna", accent: "una señal aparece", impact: "el dato sorprende", question: "¿Qué encontró la cámara?" });
  });
});
