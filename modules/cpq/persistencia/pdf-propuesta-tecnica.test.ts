import { describe, expect, it } from "vitest";

import { totalesDocumento } from "../domain/documento/totales";
import { formatearClp } from "@opai/domain";
import { renderPdfCotizacion } from "./documento-pdf";
import type { MarcaDocumentoVista } from "./marca-documento";
import { leerPdf } from "./pdf/prueba-pdf";
import { renderPdfPropuestaTecnica, type EntradaPdfPropuesta } from "./pdf-propuesta-tecnica";

const marca: MarcaDocumentoVista = {
  version: 1,
  tipografia: "inter",
  piePagina: null,
  condicionesDefault: null,
  nombreComercial: "Gard",
  razonSocial: "Gard Seguridad SpA",
  rut: null,
  direccion: null,
  colorPrimario: null,
  colorSecundario: null,
  logoUrl: null,
};
const bloque = (tipo: string, extra: object = {}) => ({
  id: tipo,
  tipo,
  activo: true,
  fijo: false,
  opcional: true,
  ...extra,
});
const secciones = [
  {
    nombre: "Planta Norte",
    lineas: [
      { nombre: "Guardia 4x4 día", tipo: "puesto", posiciones: 2, ventaMensualClp: 2_000_000 },
    ],
  },
  {
    nombre: "Planta Sur",
    lineas: [
      { nombre: "Guardia 4x4 noche", tipo: "puesto", posiciones: 2, ventaMensualClp: 1_000_000 },
    ],
  },
  { nombre: "Común", lineas: [{ nombre: "Uniformes", tipo: "item", ventaMensualClp: 300_000 }] },
];
const base = (over: Partial<EntradaPdfPropuesta> = {}): EntradaPdfPropuesta => ({
  codigo: "CPQ-2026-003",
  titulo: "Seguridad planta",
  borrador: false,
  marca,
  bloquesJson: JSON.stringify([
    bloque("portada"),
    bloque("indice"),
    bloque("comprension_servicio"),
    bloque("metodologia", { contenidoOverride: "Supervisión semanal." }),
    bloque("detalle_servicio"),
    bloque("resumen_economico"),
    bloque("condiciones"),
    bloque("incluye_exclusiones", { bibliotecaClave: "inc" }),
  ]),
  servicio: {
    codigo: "CPQ-2026-003",
    versionNumero: 4,
    secciones: [
      {
        nombre: "Planta Norte",
        puestos: [
          {
            nombre: "Guardia 4x4 día",
            posiciones: 2,
            patron: "4x4",
            horaInicio: "08:00",
            horaFin: "20:00",
            diasCobertura: 7,
          },
        ],
      },
      {
        nombre: "Planta Sur",
        puestos: [
          {
            nombre: "Guardia 4x4 noche",
            posiciones: 2,
            patron: "4x4",
            horaInicio: "20:00",
            horaFin: "08:00",
            diasCobertura: 7,
          },
        ],
      },
      { nombre: "Común", puestos: [] },
    ],
  },
  economia: {
    secciones,
    cliente: null,
    ejecutivo: "Ana Pérez",
    negocio: "Negocio",
    validaHasta: null,
    condiciones: null,
    fecha: "2026-11-06",
  },
  netoTotalClp: 3_300_000,
  apertura: "por_instalacion",
  textosBiblioteca: { inc: "Incluye uniformes y supervisión." },
  ...over,
});
const texto = async (e: EntradaPdfPropuesta) =>
  (await leerPdf(await renderPdfPropuestaTecnica(e))).paginas.join(" ");

describe("PDF propuesta técnica A4 (CAR-192 PR 2)", () => {
  it("sin texto de relleno: omite bloques vacíos y usa títulos legibles", async () => {
    const t = await texto(base());
    expect(t).not.toContain("(bloque");
    expect(t).not.toContain("_");
    expect(t).not.toContain("comprension_servicio");
    expect(t).not.toContain("Comprensión del servicio"); // sin contenido → fuera del cuerpo y del índice
    expect(t).toContain("Metodología de trabajo");
    expect(t).toContain("Qué incluye y qué no incluye");
    expect(t).toContain("Incluye uniformes y supervisión.");
    expect(t).not.toContain("Condiciones comerciales"); // no configuradas
  });

  it("no reparte el neto en partes iguales ni muestra dinero en «Común»", async () => {
    const t = await texto(base());
    expect(t).toContain("$ 2.200.000"); // Norte: 2.000.000 + 2/3 de lo común
    expect(t).toContain("$ 1.100.000"); // Sur
    expect(t).not.toMatch(/Común\s+\$/);
    expect(t).not.toContain("$ 1.650.000"); // reparto igual entre dos secciones
  });

  it("IVA y total idénticos a los de la cotización", async () => {
    const t = totalesDocumento(3_300_000);
    const prop = await texto(base());
    const cot = (
      await leerPdf(
        await renderPdfCotizacion(
          {
            codigo: "CPQ-2026-003",
            titulo: "x",
            negocio: "n",
            secciones,
            enviada: true,
            calculo: { ventaMensual: 3_300_000, fecha: "2026-11-06", borradorSinPrecio: false },
          },
          marca,
          {
            id: "p",
            tipo: "cotizacion",
            base: "clasica",
            version: 1,
            activa: true,
            bloques: [{ id: "detalle_secciones", activo: true }],
          },
        ),
      )
    ).paginas.join(" ");
    const sinNbsp = (x: string) => x.replace(/\s/g, " ");
    for (const s of [sinNbsp(formatearClp(t.ivaClp)), sinNbsp(formatearClp(t.totalClp))]) {
      expect(prop).toContain(s);
      expect(cot).toContain(s);
    }
  });

  it("marca BORRADOR solo mientras la propuesta no está congelada", async () => {
    expect(await texto(base({ borrador: true }))).toContain("BORRADOR");
    expect(await texto(base({ borrador: false }))).not.toContain("BORRADOR");
  });
});
