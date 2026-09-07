type EditorialPdfInput = {
  outlet: string;
  headline: string;
  hook: string;
  productType: string;
  objective: string;
  audience: string;
  pageSize: "Carta" | "A4";
  documentStyle: string;
  productionNotes?: string | null;
  status: string;
  approvedBy?: string | null;
  tasks: Array<{ order: number; title: string; deliverable: string | null }>;
};

type PdfLine = { text: string; font: "regular" | "bold"; size: number; x?: number; gapAfter?: number };

function latinText(value: string) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/•/g, "-")
    .replace(/[^ -ÿ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hexText(value: string) {
  return Buffer.from(latinText(value), "latin1").toString("hex").toUpperCase();
}

function wrapText(value: string, maxChars: number) {
  const words = latinText(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (!line) line = word;
    else if (`${line} ${word}`.length <= maxChars) line += ` ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export function buildEditorialPdf(input: EditorialPdfInput) {
  const [width, height] = input.pageSize === "A4" ? [595, 842] : [612, 792];
  const margin = 54;
  const usableWidth = width - margin * 2;
  const pages: PdfLine[][] = [[]];
  let y = height - 116;

  const newPage = () => { pages.push([]); y = height - 92; };
  const addWrapped = (text: string, options: { font?: "regular" | "bold"; size?: number; gapAfter?: number; x?: number } = {}) => {
    const font = options.font ?? "regular";
    const size = options.size ?? 10;
    const leading = size * 1.35;
    const maxChars = Math.max(18, Math.floor(usableWidth / (size * 0.51)));
    const wrapped = wrapText(text, maxChars);
    for (const [index, line] of wrapped.entries()) {
      if (y - leading < 64) newPage();
      pages.at(-1)!.push({ text: line, font, size, x: options.x, gapAfter: index === wrapped.length - 1 ? options.gapAfter ?? size * 0.65 : 0 });
      y -= leading;
    }
    y -= options.gapAfter ?? size * 0.65;
  };

  addWrapped(input.documentStyle.toUpperCase(), { font: "bold", size: 8, gapAfter: 10 });
  addWrapped(input.headline, { font: "bold", size: 22, gapAfter: 9 });
  addWrapped(input.hook, { size: 12, gapAfter: 15 });
  addWrapped(`Producto: ${input.productType} | Audiencia: ${input.audience}`, { font: "bold", size: 8, gapAfter: 15 });
  addWrapped("OBJETIVO EDITORIAL", { font: "bold", size: 9, gapAfter: 5 });
  addWrapped(input.objective, { size: 10, gapAfter: 15 });
  if (input.productionNotes?.trim()) {
    addWrapped("INDICACIONES DE PRODUCCION", { font: "bold", size: 9, gapAfter: 5 });
    addWrapped(input.productionNotes, { size: 10, gapAfter: 15 });
  }
  addWrapped("ENTREGABLES DEL EQUIPO AI", { font: "bold", size: 11, gapAfter: 10 });
  for (const task of input.tasks) {
    if (y < 118) newPage();
    addWrapped(`${String(task.order).padStart(2, "0")}  ${task.title}`, { font: "bold", size: 10, gapAfter: 4 });
    addWrapped(task.deliverable ?? "Entrega pendiente.", { size: 9, gapAfter: 13, x: margin + 12 });
  }
  addWrapped("CONTROL HUMANO", { font: "bold", size: 9, gapAfter: 5 });
  addWrapped(input.status === "COMPLETED" ? `Paquete aprobado por ${input.approvedBy ?? "Administracion"}.` : "Borrador generado por el equipo AI. Requiere revision y aprobacion del administrador antes de distribuirse.", { size: 10 });

  const pageObjects: Array<{ pageId: number; contentId: number; stream: string }> = [];
  const fontRegularId = 3;
  const fontBoldId = 4;
  pages.forEach((lines, pageIndex) => {
    let cursorY = height - 56;
    const commands: string[] = [
      `0.08 0.16 0.27 rg 0 ${height - 42} ${width} 42 re f`,
      `BT /F2 11 Tf 1 1 1 rg ${margin} ${height - 27} Td <${hexText(input.outlet.toUpperCase())}> Tj ET`,
      `BT /F1 7 Tf 0.68 0.76 0.86 rg ${width - 145} ${height - 27} Td <${hexText("NEXO - DOCUMENTO PDF")}> Tj ET`,
    ];
    if (pageIndex === 0) {
      const statusLabel = input.status === "COMPLETED" ? "APROBADO" : "BORRADOR - REVISION HUMANA";
      commands.push(`0.92 0.95 0.98 rg ${margin} ${height - 83} ${usableWidth} 24 re f`);
      commands.push(`BT /F2 8 Tf 0.18 0.35 0.58 rg ${margin + 10} ${height - 68} Td <${hexText(statusLabel)}> Tj ET`);
      cursorY = height - 116;
    } else {
      commands.push(`BT /F2 8 Tf 0.30 0.40 0.53 rg ${margin} ${height - 68} Td <${hexText(input.headline)}> Tj ET`);
      cursorY = height - 92;
    }
    for (const line of lines) {
      const leading = line.size * 1.35;
      commands.push(`BT /${line.font === "bold" ? "F2" : "F1"} ${line.size} Tf 0.10 0.15 0.22 rg ${line.x ?? margin} ${cursorY} Td <${hexText(line.text)}> Tj ET`);
      cursorY -= leading + (line.gapAfter ?? 0);
    }
    commands.push(`0.82 0.86 0.90 RG ${margin} 48 m ${width - margin} 48 l S`);
    commands.push(`BT /F1 7 Tf 0.38 0.45 0.54 rg ${margin} 32 Td <${hexText(`Generado por Nexo | ${input.pageSize} | Pagina ${pageIndex + 1} de ${pages.length}`)}> Tj ET`);
    pageObjects.push({ pageId: 5 + pageIndex * 2, contentId: 6 + pageIndex * 2, stream: commands.join("\n") });
  });

  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Count ${pageObjects.length} /Kids [${pageObjects.map((page) => `${page.pageId} 0 R`).join(" ")}] >>`;
  objects[fontRegularId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[fontBoldId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  for (const page of pageObjects) {
    objects[page.pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${page.contentId} 0 R >>`;
    objects[page.contentId] = `<< /Length ${Buffer.byteLength(page.stream, "latin1")} >>\nstream\n${page.stream}\nendstream`;
  }

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [0];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = Buffer.byteLength(pdf, "latin1");
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

export function editorialPdfFilename(outlet: string) {
  const slug = latinText(outlet).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "medio";
  return `nexo-${slug}-documento-editorial.pdf`;
}
