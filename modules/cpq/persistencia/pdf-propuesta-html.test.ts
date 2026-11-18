import { htmlBasePropuesta } from "../domain/documento/html-base-propuesta";
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

it("separa portada base de índice y no imprime CSS ni agrega páginas vacías", async () => {
  const html = htmlBasePropuesta({ titulo: "Propuesta ficticia", cliente: "Cliente QA", marca: {
    nombre: "Empresa QA", colorPrimario: null, colorSecundario: null, piePagina: null,
  } }).replace("{{secciones}}", "<h2>Índice</h2><p>Resumen sintético</p>");
  const { paginas } = await leerPdf(await renderPdfPropuestaHtml({ codigo: "QA-1", fecha: "", borrador: false, marca, logo: null, html }));
  expect(paginas).toHaveLength(2);
  expect(paginas[0]).toContain("Propuesta ficticia");
  expect(paginas[0]).toContain("Cliente: Cliente QA");
  expect(paginas[0]).not.toContain("ClienteCliente");
  expect(paginas[0]).not.toContain("Índice");
  expect(paginas[1]).toContain("Índice");
  expect(paginas.join(" ")).not.toContain("min-height");
});
it("colapsa saltos iniciales, consecutivos y finales sin páginas vacías", async () => {
  const salto = '<div style="page-break-before:always"></div>';
  const html = salto + "<p>Primera QA</p>" + salto + salto + "<p>Segunda QA</p>" + salto;
  const { paginas } = await leerPdf(await renderPdfPropuestaHtml({ codigo: "QA-2", fecha: "", borrador: false, marca, logo: null, html }));
  expect(paginas).toHaveLength(2);
  expect(paginas[0]).toContain("Primera QA");
  expect(paginas[1]).toContain("Segunda QA");
});
