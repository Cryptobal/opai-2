import type { Contexto } from "@opai/capabilities";

import type { ResultadoCalculo } from "../domain/motor";
import { resumenCalculoCongeladoParaLista } from "./resumen-lista-cache";
import type { VersionCtx } from "./version";

type FilaLinea = { tipo: string; habilitada: boolean; posiciones: number };

export const AVISO_SIN_CALCULO = "sin cálculo congelado completo";

function fallbackCongelado(
  version: Pick<VersionCtx, "ventaMensualClp" | "validaHasta">,
  lineas: readonly FilaLinea[],
): ResultadoCalculo {
  const puestos = lineas.filter((l) => l.habilitada && l.tipo === "puesto");
  const posiciones = puestos.reduce((s, l) => s + l.posiciones, 0);
  const fecha = (version.validaHasta ?? new Date()).toISOString().slice(0, 10);
  return {
    lineas: [],
    secciones: [],
    categorias: [],
    costoBase: 0,
    totalMensual: 0,
    directos: 0,
    indirectos: 0,
    costoMensual: 0,
    costoUnico: 0,
    ventaMensual: version.ventaMensualClp,
    pagosUnicos: 0,
    margenEfectivoPct: -1,
    semaforo: "rojo",
    instrumentos: {
      financiero: 0,
      garantia: 0,
      administracion: 0,
      responsabilidad: 0,
      garantizado: 0,
      baseContrato: 0,
      primaAnual: 0,
      kEscalado: 0,
      grossUp: false,
      incluyeUnicos: false,
    },
    dotacion: { posiciones, personasEscaladas: 0 },
    uf: null,
    fecha,
    estado: "borrador",
    advertencias: [AVISO_SIN_CALCULO],
    noEnviable: true,
    requiereAprobacion: false,
    traza: [],
  };
}

function esResultadoCalculoCompleto(parsed: unknown): parsed is ResultadoCalculo {
  if (!parsed || typeof parsed !== "object") return false;
  const o = parsed as Record<string, unknown>;
  return (
    Array.isArray(o.advertencias) &&
    Array.isArray(o.lineas) &&
    typeof o.fecha === "string" &&
    typeof o.pagosUnicos === "number"
  );
}

function esResumenListaLegacy(parsed: unknown): parsed is ReturnType<typeof resumenCalculoCongeladoParaLista> {
  if (!parsed || typeof parsed !== "object") return false;
  const o = parsed as Record<string, unknown>;
  const keys = Object.keys(o);
  if (keys.length > 6) return false;
  return (
    !Array.isArray(o.advertencias) &&
    !Array.isArray(o.lineas) &&
    (typeof o.ventaMensual === "number" || o.ventaMensual === null) &&
    (o.semaforo === "verde" || o.semaforo === "amarillo" || o.semaforo === "rojo" || o.semaforo === undefined)
  );
}

function reconstruirDesdeResumenLegacy(
  parsed: ReturnType<typeof resumenCalculoCongeladoParaLista>,
  version: Pick<VersionCtx, "ventaMensualClp" | "validaHasta">,
  lineas: readonly FilaLinea[],
): ResultadoCalculo {
  const base = fallbackCongelado(version, lineas);
  const advertencias = base.advertencias.filter((a) => a !== AVISO_SIN_CALCULO);
  return {
    ...base,
    ventaMensual: parsed.ventaMensual ?? version.ventaMensualClp ?? base.ventaMensual,
    semaforo: parsed.semaforo ?? base.semaforo,
    margenEfectivoPct:
      parsed.margenEfectivoPct != null && parsed.margenEfectivoPct >= 0
        ? parsed.margenEfectivoPct
        : base.margenEfectivoPct,
    noEnviable: parsed.noEnviable ?? base.noEnviable,
    advertencias: advertencias.length ? advertencias : base.advertencias,
  };
}

/** R-CPQ-010: lee el JSON congelado al enviar o reconstruye venta sin inventar margen ni semáforo verde. */
export function calculoCongelado(
  _ctx: Contexto,
  version: Pick<VersionCtx, "ventaMensualClp" | "validaHasta" | "calculoCongeladoJson">,
  lineas: readonly FilaLinea[],
): ResultadoCalculo {
  if (version.calculoCongeladoJson) {
    try {
      const parsed: unknown = JSON.parse(version.calculoCongeladoJson);
      if (esResultadoCalculoCompleto(parsed)) return parsed;
      if (esResumenListaLegacy(parsed)) return reconstruirDesdeResumenLegacy(parsed, version, lineas);
    } catch {
      /* JSON inválido: cae al fallback */
    }
  }
  return fallbackCongelado(version, lineas);
}
