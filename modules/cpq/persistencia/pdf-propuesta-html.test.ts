import { describe, expect, it } from "vitest";

import type { MarcaDocumentoVista } from "./marca-documento";
import { leerPdf } from "./pdf/prueba-pdf";
import { renderPdfPropuestaHtml } from "./pdf-propuesta-html";

const marca: MarcaDocumentoVista = {
  version: 1, tipografia: "inter", piePagina: null, condicionesDefault: null, nombreComercial: "Empresa QA",
  razonSocial: null, rut: null, direccion: null, colorPrimario: "#1f3a5f", colorSecundario: null, logoUrl: null,
};

describe("PDF de la propuesta con plantilla HTML (CAR-533)", () => {
  it("lleva membrete, el contenido del HTML, la tabla y la marca de agua del borrador", async () => {
    const html =
      "<h1>Propuesta para Cliente QA</h1><p>Servicio de guardias.</p><ul><li>Ronda nocturna</li></ul>" +
      "<table><tr><th>Puesto</th><th>Turno</th></tr><tr><td>Guardia</td><td>4×4</td></tr></table>";
    const { paginas } = await leerPdf(await renderPdfPropuestaHtml({ codigo: "CPQ-1", fecha: "15-11-2026", borrador: true, marca, logo: null, html }));
    const texto = paginas.join(" ");
    for (const t of ["PROPUESTA TÉCNICA", "CPQ-1", "Propuesta para Cliente QA", "Servicio de guardias.", "• Ronda nocturna", "Puesto", "4×4", "BORRADOR"]) {
      expect(texto).toContain(t);
    }
  });

  it("un HTML largo continúa en páginas nuevas", async () => {
    const html = Array.from({ length: 120 }, (_, i) => `<p>Párrafo ${i + 1} de la propuesta.</p>`).join("");
    const { paginas } = await leerPdf(await renderPdfPropuestaHtml({ codigo: "CPQ-2", fecha: "", borrador: false, marca, logo: null, html }));
    expect(paginas.length).toBeGreaterThan(1);
    expect(paginas.join(" ")).toContain("Párrafo 120");
  });
});
