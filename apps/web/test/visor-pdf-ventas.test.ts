import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { VisorPdfEscritorio, VisorPdfTactil } from "@/app/_components/visor-pdf";

const props = { pdfUrl: "blob:x", titulo: "Vista previa del borrador en PDF", nombreArchivo: "borrador.pdf" };
const FINANZAS = "app/(erp)/finanzas/ventas/nuevo/";

describe("vista previa del PDF de Ventas en el teléfono (bug prod)", () => {
  it("modo táctil: botones Abrir y Descargar, sin iframe", () => {
    const h = renderToStaticMarkup(createElement(VisorPdfTactil, props));
    expect(h).toContain("Abrir PDF");
    expect(h).toContain("Descargar PDF");
    expect(h).not.toContain("<iframe");
  });

  it("modo táctil con onCerrar agrega «Cerrar»", () => {
    const h = renderToStaticMarkup(createElement(VisorPdfTactil, { ...props, onCerrar: () => undefined }));
    expect(h).toContain("Cerrar");
  });

  it("modo escritorio: iframe con la altura pedida y Descargar, sin Abrir", () => {
    const h = renderToStaticMarkup(createElement(VisorPdfEscritorio, { ...props, alto: "h-[60dvh]" }));
    expect(h).toContain("<iframe");
    expect(h).toContain('src="blob:x"');
    expect(h).toContain("h-[60dvh]");
    expect(h).toContain("Descargar PDF");
    expect(h).not.toContain("Abrir PDF");
  });

  it.each(["emitir-pdf-en-vista.tsx", "emitir-pdf-previo.tsx"])("%s usa VisorPdf y no un iframe crudo", (archivo) => {
    const src = readFileSync(FINANZAS + archivo, "utf8");
    expect(src).toContain("<VisorPdf");
    expect(src).not.toContain("<iframe");
  });
});
