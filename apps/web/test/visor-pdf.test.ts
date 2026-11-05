import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { textoPaginas } from "@/app/(erp)/cotizaciones/[id]/_componentes/texto-paginas";
import { VisorPdf } from "@/app/_components/visor-pdf";

describe("vista previa del PDF (CAR-192)", () => {
  it("el plural de las páginas", () => {
    expect(textoPaginas(1)).toBe("1 página A4");
    expect(textoPaginas(2)).toBe("2 páginas A4");
  });

  it("en escritorio (sin pantalla táctil) usa el iframe con Descargar y Cerrar", () => {
    const h = renderToStaticMarkup(
      createElement(VisorPdf, { pdfUrl: "blob:x", titulo: "Vista", nombreArchivo: "a.pdf", onCerrar: () => undefined }),
    );
    expect(h).toContain("<iframe");
    expect(h).toContain("Descargar PDF");
    expect(h).toContain("Cerrar");
    expect(h).not.toContain("Abrir PDF");
  });
});
