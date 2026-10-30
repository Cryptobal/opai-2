import { periodoSiguiente } from "@opai/domain";

import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import type { Periodo } from "./tipos";

export const cargarPeriodos = () => ejecutarComoUsuario<Periodo[]>("erp", "nomina.periodos.listar", {});

/** Permisos finos de Nómina para mostrar u ocultar acciones (la capacidad igual los exige, ADR-022). */
export async function permisosNomina() {
  const identidad = await identidadActual();
  const puede = identidad ? puedeDeIdentidad(identidad) : () => false;
  return {
    periodos: puede("nomina:periodos.manage"),
    pagar: puede("nomina:periodos.pagar"),
    novedadesRead: puede("nomina:novedades.read"),
    novedades: puede("nomina:novedades.manage"),
    prestamosRead: puede("nomina:prestamos.read"),
    prestamos: puede("nomina:prestamos.manage"),
    anticipos: puede("nomina:anticipos.manage"),
    obligaciones: puede("nomina:obligaciones.manage"),
  };
}

/** Mes que sugiere «Abrir período»: el siguiente al más reciente, o el mes actual si no hay ninguno. */
export function mesSugerido(periodos: readonly Periodo[]): { anio: number; mes: number } {
  const ultimo = periodos[0];
  if (ultimo) return periodoSiguiente(ultimo.anio, ultimo.mes);
  const hoy = new Date();
  return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
}
