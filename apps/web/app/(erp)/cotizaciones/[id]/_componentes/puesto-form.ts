import { UF_ESCALA } from "@opai/domain";

import type { LineaEditable } from "../../_componentes/puesto-tipos";

/** Estado de texto de la hoja de puesto; "" en un supuesto = defecto del tenant. */
export type EstadoPuesto = {
  nombre: string;
  posiciones: string;
  cargoId: string;
  modo: "bruto" | "liquido";
  sueldo: string;
  liquido: string;
  colacion: string;
  movilizacion: string;
  afp: string;
  saludTipo: string;
  saludPlanUf: string;
  tipoContrato: string;
  patron: string;
  horaInicio: string;
  horaFin: string;
};

const texto = (n: number | null | undefined) => (n == null ? "" : String(n));

export function estadoInicial(l?: LineaEditable): EstadoPuesto {
  return {
    nombre: l?.nombre ?? "Guardia",
    posiciones: String(l?.posiciones ?? 1),
    cargoId: l?.cargoId ?? "",
    modo: l?.sueldoModo === "liquido" ? "liquido" : "bruto",
    sueldo: texto(l?.sueldoBaseClp),
    liquido: texto(l?.liquidoObjetivoClp),
    colacion: texto(l?.colacionClp),
    movilizacion: texto(l?.movilizacionClp),
    afp: l?.afp ?? "",
    saludTipo: l?.saludTipo ?? "",
    saludPlanUf: l?.saludPlanUf != null ? String(l.saludPlanUf / UF_ESCALA) : "",
    tipoContrato: l?.tipoContrato ?? "",
    patron: l?.patron ?? "",
    horaInicio: l?.horaInicio ?? "",
    horaFin: l?.horaFin ?? "",
  };
}

const entero = (s: string) => {
  const d = s.replace(/\D/g, "");
  return d ? Number.parseInt(d, 10) : null;
};

/** Entrada de `cpq.lineas.crear|actualizar`; sin permiso de costos no viaja ningún monto. */
export function entradaDePuesto(e: EstadoPuesto, verCostos: boolean) {
  const pos = Number.parseInt(e.posiciones, 10);
  const plan = Number.parseFloat(e.saludPlanUf.replace(",", "."));
  const sueldo = entero(e.sueldo);
  const liquido = entero(e.liquido);
  return {
    nombre: e.nombre.trim() || "Puesto",
    posiciones: Number.isFinite(pos) && pos > 0 ? pos : 1,
    cargoId: e.cargoId || null,
    ...(e.patron ? { patron: e.patron } : {}),
    ...(e.horaInicio ? { horaInicio: e.horaInicio } : {}),
    ...(e.horaFin ? { horaFin: e.horaFin } : {}),
    afp: e.afp || null,
    saludTipo: e.saludTipo || null,
    saludPlanUf: e.saludTipo === "isapre" && Number.isFinite(plan) ? Math.round(plan * UF_ESCALA) : null,
    tipoContrato: e.tipoContrato || null,
    ...(verCostos
      ? {
          sueldoModo: e.modo,
          ...(e.modo === "bruto" && sueldo != null ? { sueldoBaseClp: sueldo } : {}),
          liquidoObjetivoClp: e.modo === "liquido" ? liquido : null,
          colacionClp: entero(e.colacion),
          movilizacionClp: entero(e.movilizacion),
        }
      : {}),
  };
}
