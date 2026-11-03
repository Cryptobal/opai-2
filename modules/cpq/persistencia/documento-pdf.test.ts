import { describe, expect, it } from "vitest";

import { buildPdfPropuesta } from "./pdf-propuesta";
import { pdfContieneTexto } from "./documento-pdf";
import { entradaPdfMuestra } from "./entrada-pdf-cotizacion";
import { renderPdfCotizacion } from "./documento-pdf";

describe("PDF cotización CPQ (CAR-141)", () => {
  it("marca borrador sin precio y totales CLP/UF", () => {
    const bytes = buildPdfPropuesta({
      codigo: "CPQ-2026-010",
      titulo: "Prueba",
      negocio: "Negocio",
      secciones: [{ nombre: "Planta", lineas: [{ nombre: "Guardia", tipo: "puesto" }] }],
      calculo: { ventaMensual: null, fecha: "2026-11-03", borradorSinPrecio: true },
    });
    expect(pdfContieneTexto(bytes, "BORRADOR SIN PRECIO")).toBe(true);
    expect(pdfContieneTexto(bytes, "Borrador sin precio")).toBe(true);
  });

  it("incluye cliente, condiciones y firma en layout clásico", () => {
    const entrada = entradaPdfMuestra();
    const marca = {
      version: 1,
      tipografia: "inter" as const,
      piePagina: "Pie legal",
      condicionesDefault: "Condición por defecto",
      nombreComercial: "Gard",
      razonSocial: "Gard SpA",
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
      bloques: [
        { id: "encabezado" as const, activo: true },
        { id: "resumen_comercial" as const, activo: true },
        { id: "detalle_secciones" as const, activo: true },
        { id: "condiciones" as const, activo: true },
        { id: "pie" as const, activo: true },
      ],
    };
    const bytes = renderPdfCotizacion(entrada, marca, plantilla);
    expect(bytes[0]).toBe(0x25);
    expect(pdfContieneTexto(bytes, "Cliente ejemplo")).toBe(true);
    expect(pdfContieneTexto(bytes, "Condiciones comerciales")).toBe(true);
    expect(pdfContieneTexto(bytes, "Firma")).toBe(true);
    expect(pdfContieneTexto(bytes, "Equivalente UF")).toBe(true);
  });
});
