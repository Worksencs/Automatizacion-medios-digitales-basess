import { describe, expect, it } from "vitest";
import { buildEditorialPdf, editorialPdfFilename } from "@/src/services/editorial-pdf";

describe("salida editorial PDF", () => {
  it("genera un PDF válido con paginación y control humano", () => {
    const pdf = buildEditorialPdf({ outlet: "Trece Noticias", headline: "Una noticia de prueba para Guatemala", hook: "Entradilla verificada.", productType: "Nota periodística", objective: "Informar con claridad", audience: "Lectores", pageSize: "Carta", documentStyle: "Nota informativa", status: "WAITING_ADMIN", tasks: Array.from({ length: 8 }, (_, index) => ({ order: index + 1, title: `Entrega ${index + 1}`, deliverable: "Contenido verificado y preparado por el agente responsable." })) });
    expect(pdf.subarray(0, 8).toString()).toBe("%PDF-1.4");
    expect(pdf.toString("latin1")).toContain("startxref");
    expect(pdf.length).toBeGreaterThan(2000);
  });

  it("produce un nombre de archivo estable", () => {
    expect(editorialPdfFilename("TV Azteca Guate")).toBe("nexo-tv-azteca-guate-documento-editorial.pdf");
  });
});
