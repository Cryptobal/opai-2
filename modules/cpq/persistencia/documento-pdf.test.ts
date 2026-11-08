import { describe, expect, it } from "vitest";

import { etiquetaIva, totalesDocumento } from "../domain/documento/totales";
import { renderPdfCotizacion } from "./documento-pdf";
import { entradaPdfMuestra } from "./entrada-pdf-cotizacion";
import type { MarcaDocumentoVista } from "./marca-documento";
import { leerPdf } from "./pdf/prueba-pdf";
import { buildPdfPropuesta } from "./pdf-propuesta";

const marca: MarcaDocumentoVista = {
  version: 1,
  tipografia: "inter",
  piePagina: "Pie legal",
  condicionesDefault: null,
  nombreComercial: "Gard",
  razonSocial: "Gard Seguridad SpA",
  rut: "76.000.000-0",
  direccion: "Santiago",
  colorPrimario: "#4a3fd8",
  colorSecundario: null,
  logoUrl: null,
};
const plantilla = {
  id: "p1",
  tipo: "cotizacion" as const,
  base: "clasica" as const,
  version: 1,
  activa: true,
  bloques: (
    [
      "encabezado",
      "datos_empresa",
      "resumen_comercial",
      "detalle_secciones",
      "condiciones",
      "pie",
    ] as const
  ).map((id) => ({ id, activo: true })),
};
const texto = async (b: Uint8Array) => (await leerPdf(b)).paginas.join(" ");

describe("PDF cotización A4 con fuentes incrustadas (CAR-192 PR 2)", () => {
  it("es A4 y conserva acentos y ñ en el texto extraído", async () => {
    const e = entradaPdfMuestra();
    e.titulo = "Cotización, Remuneración, Año, ñ, ú";
    e.enviada = true;
    const { paginas, medidas } = await leerPdf(await renderPdfCotizacion(e, marca, plantilla));
    expect(medidas[0]?.ancho).toBeCloseTo(595.28, 1);
    expect(medidas[0]?.alto).toBeCloseTo(841.89, 1);
    const t = paginas.join(" ");
    expect(t).toContain("Cotización, Remuneración, Año, ñ, ú");
    expect(t).toContain("Gard Seguridad SpA");
  });

  it("muestra neto, IVA 19 % y total con los mismos números que totalesDocumento", async () => {
    const e = entradaPdfMuestra();
    e.enviada = true;
    const t = totalesDocumento(2_170_000);
    expect(t).toMatchObject({ ivaClp: 412_300, totalClp: 2_582_300 });
    const out = await texto(await renderPdfCotizacion(e, marca, plantilla));
    expect(out).toContain(etiquetaIva(t.tasaIvaPct));
    expect(out).toContain("$ 412.300");
    expect(out).toContain("$ 2.582.300");
  });

  it("marca de agua BORRADOR solo mientras la versión no se ha enviado", async () => {
    const e = entradaPdfMuestra();
    e.enviada = false;
    expect(await texto(await renderPdfCotizacion(e, marca, plantilla))).toContain("BORRADOR");
    e.enviada = true;
    expect(await texto(await renderPdfCotizacion(e, marca, plantilla))).not.toContain("BORRADOR");
  });

  it("omite condiciones si no están configuradas y las muestra si lo están", async () => {
    const e = entradaPdfMuestra();
    e.condiciones = null;
    e.enviada = true;
    const sin = await texto(await renderPdfCotizacion(e, marca, plantilla));
    expect(sin).not.toContain("Condiciones comerciales");
    expect(sin).not.toContain("estándar del tenant");
    e.condiciones = "Pago a 30 días.";
    expect(await texto(await renderPdfCotizacion(e, marca, plantilla))).toContain(
      "Pago a 30 días.",
    );
  });

  it("pagina con muchas líneas y repite pie «Página n de m»", async () => {
    const e = entradaPdfMuestra();
    e.enviada = true;
    e.secciones = [
      {
        nombre: "Planta",
        lineas: Array.from({ length: 70 }, (_, i) => ({
          nombre: `Puesto ${i + 1}`,
          tipo: "puesto",
          posiciones: 1,
          ventaMensualClp: 100_000,
        })),
      },
    ];
    const { paginas } = await leerPdf(await renderPdfCotizacion(e, marca, plantilla));
    expect(paginas.length).toBeGreaterThan(1);
    expect(paginas[1]).toContain(`Página 2 de ${paginas.length}`);
  });

  it("borrador sin precio no inventa totales", async () => {
    const pdf = await buildPdfPropuesta({
      codigo: "CPQ-2026-010",
      titulo: "Prueba",
      negocio: "Negocio",
      secciones: [{ nombre: "Planta", lineas: [{ nombre: "Guardia", tipo: "puesto" }] }],
      calculo: { ventaMensual: null, fecha: "2026-11-03", borradorSinPrecio: true },
    });
    const t = await texto(pdf);
    expect(t).toContain("BORRADOR SIN PRECIO");
    expect(t).not.toContain("Total mensual");
  });
});
