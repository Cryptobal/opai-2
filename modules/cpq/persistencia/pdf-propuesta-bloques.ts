/** Bloques del PDF de la propuesta técnica (A4). Un bloque sin contenido real se omite: nunca hay texto de relleno. */
import { formatearClp } from "@opai/domain";

import { etiquetaIva, repartirSeccionesComunes } from "../domain/documento/totales";
import {
  proyectarResumenEconomico,
  type AperturaPropuesta,
  type ServicioDesdeCotizacion,
} from "../domain/documento/propuesta-tecnica";
import type { EntradaPdfCotizacion } from "./documento-pdf-tipos";
import type { MarcaDocumentoVista } from "./marca-documento";
import { TENUE } from "./pdf/colores";
import { type Hoja } from "./pdf/hoja";
import { cajaTotales, tabla } from "./pdf/hoja-tabla";
import { etiquetaSeccion } from "./pdf/membrete";

export const TITULOS_BLOQUE: Record<string, string> = {
  portada: "Portada",
  indice: "Índice",
  seccion_institucional: "Quiénes somos",
  comprension_servicio: "Comprensión del servicio",
  detalle_servicio: "Detalle del servicio",
  resumen_economico: "Resumen económico",
  condiciones: "Condiciones comerciales",
  incluye_exclusiones: "Qué incluye y qué no incluye",
  metodologia: "Metodología de trabajo",
  contacto_ejecutivo: "Su ejecutivo comercial",
  certificaciones: "Certificaciones",
  clientes_referencia: "Clientes de referencia",
  texto_libre: "Información adicional",
};

const DIAS = (n: number | null) =>
  n === 7 ? "Lunes a domingo" : n === 5 ? "Lunes a viernes" : n != null ? `${n} días` : "";

export function textoSeccion(h: Hoja, titulo: string, texto: string): void {
  etiquetaSeccion(h, titulo);
  for (const p of texto
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean)) {
    h.parrafo(p, { tam: 9.5 });
    h.espacio(3);
  }
}

export function indice(h: Hoja, titulos: readonly string[]): void {
  etiquetaSeccion(h, "Índice");
  titulos.forEach((t, i) => h.parrafo(`${i + 1}.  ${t}`, { tam: 10 }));
}

export function detalleServicio(h: Hoja, servicio: ServicioDesdeCotizacion): void {
  etiquetaSeccion(h, TITULOS_BLOQUE["detalle_servicio"]!);
  for (const s of servicio.secciones.filter((x) => x.puestos.length)) {
    h.asegurar(60);
    h.espacio(4);
    h.parrafo(s.nombre, { fuente: "semi", tam: 10 });
    h.espacio(2);
    tabla(
      h,
      [
        { titulo: "Puesto", peso: 4 },
        { titulo: "Dotación", peso: 1.3, alinear: "der", mono: true },
        { titulo: "Turno y cobertura", peso: 4 },
      ],
      s.puestos.map((p) => ({
        celdas: [
          p.nombre,
          `×${p.posiciones}`,
          [
            p.patron,
            p.horaInicio && p.horaFin ? `${p.horaInicio}–${p.horaFin}` : null,
            DIAS(p.diasCobertura),
          ]
            .filter(Boolean)
            .join(" · "),
        ],
      })),
    );
  }
}

export function resumenEconomico(
  h: Hoja,
  d: {
    apertura: AperturaPropuesta;
    secciones: EntradaPdfCotizacion["secciones"];
    netoTotalClp: number;
    gastosGeneralesYUtilidadClp?: number | null;
    tasaIvaPct?: number;
  },
): void {
  etiquetaSeccion(h, TITULOS_BLOQUE["resumen_economico"]!);
  const econ = d.secciones.map((s) => ({
    nombre: s.nombre,
    tienePuestos: s.lineas.some((l) => l.tipo === "puesto"),
    netoMensualClp: s.lineas.reduce((a, l) => a + (l.ventaMensualClp ?? 0), 0),
  }));
  const filas = repartirSeccionesComunes(econ);
  const r = proyectarResumenEconomico({
    apertura: d.apertura,
    secciones: filas,
    netoTotalClp: d.netoTotalClp,
    ...(d.gastosGeneralesYUtilidadClp !== undefined
      ? { gastosGeneralesYUtilidadClp: d.gastosGeneralesYUtilidadClp }
      : {}),
    ...(d.tasaIvaPct !== undefined ? { tasaIvaPct: d.tasaIvaPct } : {}),
  });
  const suma = r.lineas.reduce((a, l) => a + l.netoMensualClp, 0);
  if (r.lineas.length && suma === d.netoTotalClp) {
    tabla(
      h,
      [
        { titulo: "Instalación", peso: 5 },
        { titulo: "Neto mensual", peso: 2.4, alinear: "der", mono: true },
      ],
      r.lineas.map((l) => ({ celdas: [l.instalacion, formatearClp(l.netoMensualClp)] })),
    );
  }
  const filasTotal = [{ etiqueta: "Neto mensual", valor: formatearClp(r.netoTotalClp) }];
  if (r.gastosGeneralesYUtilidadClp != null) {
    filasTotal.push({
      etiqueta: "Gastos generales y utilidad",
      valor: formatearClp(r.gastosGeneralesYUtilidadClp),
    });
  }
  filasTotal.push({
    etiqueta: etiquetaIva(d.tasaIvaPct ?? 190_000),
    valor: formatearClp(r.ivaClp),
  });
  cajaTotales(h, [
    ...filasTotal,
    { etiqueta: "Total mensual", valor: formatearClp(r.totalClp), fuerte: true },
  ]);
}

export function contactoEjecutivo(h: Hoja, ejecutivo: string, marca: MarcaDocumentoVista): void {
  etiquetaSeccion(h, TITULOS_BLOQUE["contacto_ejecutivo"]!);
  h.parrafo(ejecutivo, { fuente: "semi", tam: 10.5 });
  h.parrafo(marca.nombreComercial ?? marca.razonSocial ?? "", { tam: 9, color: TENUE });
}
