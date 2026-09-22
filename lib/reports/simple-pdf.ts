type PdfLine = { primary: string; secondary?: string };

function ascii(value: string) {
  return value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "?").replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

export function createHistoryPdf(title: string, organization: string, lines: PdfLine[]) {
  const pageSize = 38;
  const groups = Array.from({ length: Math.max(1, Math.ceil(lines.length / pageSize)) }, (_, index) => lines.slice(index * pageSize, (index + 1) * pageSize));
  const objects: string[] = [];
  const add = (value: string) => { objects.push(value); return objects.length; };
  const catalogId = add("");
  const pagesId = add("");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];

  for (const [pageIndex, group] of groups.entries()) {
    const contentLines = [
      "BT /F1 17 Tf 42 800 Td (" + ascii(title) + ") Tj ET",
      "BT /F1 10 Tf 42 781 Td (" + ascii(`${organization}  |  Generated ${new Date().toLocaleString("en-PH")}`) + ") Tj ET",
      ...group.flatMap((line, index) => {
        const y = 750 - index * 18;
        return [
          `BT /F1 9 Tf 42 ${y} Td (${ascii(line.primary)}) Tj ET`,
          line.secondary ? `BT /F1 7 Tf 58 ${y - 9} Td (${ascii(line.secondary)}) Tj ET` : "",
        ].filter(Boolean);
      }),
      `BT /F1 8 Tf 500 24 Td (Page ${pageIndex + 1} of ${groups.length}) Tj ET`,
    ].join("\n");
    const contentId = add(`<< /Length ${contentLines.length} >>\nstream\n${contentLines}\nendstream`);
    const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
