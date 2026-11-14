// Costo laboral ESTIMADO por puesto para la rentabilidad (CAR-174). No es una liquidación: usa la capa
// de sueldo vigente (puesto → instalación) y supuestos fijos de contrato, AFP y salud, como CPQ.
// Los montos de sueldo solo se usan con core:estructuras.read_sensible (D7, `ocultasDe`, que además audita).
import { costoEmpleadorPorPersona, juegoDeValores, resolverEstructura, type JuegoDeValores } from "@opai/domain";

import type { Contexto } from "../types";
import { dondeInstalacion, dondePuesto } from "../core/maestros/alcance";
import { aFecha } from "../core/maestros/comun";
import { dondeEstructura } from "../core/maestros/estructuras-alcance";
import { ocultasDe } from "../core/maestros/estructuras-lectura";
import { aDominio } from "../core/maestros/estructuras-vista";
import { clavesFaltantes, mutualAdicionalTenant, publicacionesParaFecha } from "../core/remuneraciones";
import type { CostoPuesto } from "./rentabilidad-calculo";

/** Juego legal del día de corte, o null si faltan publicaciones (todo queda «sin costo»). */
async function juegoDe(ctx: Contexto, fecha: string): Promise<JuegoDeValores | null> {
  const valores = await publicacionesParaFecha(ctx, fecha);
  if (clavesFaltantes(fecha, valores).length > 0) return null;
  try {
    return await juegoDeValores(fecha, valores);
  } catch {
    return null;
  }
}

/** Puestos activos que se cruzan con el mes [inicio, finExclusivo) y su costo estimado al día de corte. */
/** `juegoFijo` solo para pruebas: evita sembrar valores legales globales en la base compartida. */
export async function costosDePuestos(ctx: Contexto, inicio: string, finExclusivo: string, corte: string, juegoFijo?: JuegoDeValores | null) {
  const puestos = await ctx.db.puesto.findMany({
    where: {
      estado: "activo",
      AND: [
        dondePuesto(ctx),
        { instalacion: dondeInstalacion(ctx) },
        { OR: [{ vigenteDesde: null }, { vigenteDesde: { lt: aFecha(finExclusivo) } }] },
        { OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: aFecha(inicio) } }] },
      ],
    },
    select: { id: true, instalacionId: true, horasSemanales: true },
  });
  if (puestos.length === 0) return { costos: [] as CostoPuesto[], sinValoresLegales: false };
  const filas = await ctx.db.estructuraSueldo.findMany({
    where: {
      estado: "vigente",
      vigenteDesde: { lte: aFecha(corte) },
      OR: [{ nivel: "puesto", puestoId: { in: puestos.map((p) => p.id) } }, { nivel: "instalacion", instalacionId: { in: [...new Set(puestos.map((p) => p.instalacionId))] } }],
      AND: [await dondeEstructura(ctx), { OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: aFecha(corte) } }] }],
    },
    include: { items: { orderBy: { orden: "asc" } } },
  });
  const [juego, mutual] = await Promise.all([juegoFijo !== undefined ? juegoFijo : juegoDe(ctx, corte), mutualAdicionalTenant(ctx)]);
  // Sin valores legales no se usa ningún monto: no se pasa por ocultasDe, que auditaría una lectura de sueldos.
  if (!juego) return { costos: puestos.map((p): CostoPuesto => ({ instalacionId: p.instalacionId, estado: "sin_costo" })), sinValoresLegales: true };
  const ocultas = await ocultasDe(ctx, filas);
  const costos = puestos.map((p): CostoPuesto => {
    const propias = filas.filter((f) => (f.nivel === "puesto" && f.puestoId === p.id) || (f.nivel === "instalacion" && f.instalacionId === p.instalacionId));
    const r = resolverEstructura(corte, {
      puesto: propias.filter((f) => f.nivel === "puesto").map((f) => aDominio(f, f.items)),
      instalacion: propias.filter((f) => f.nivel === "instalacion").map((f) => aDominio(f, f.items)),
    });
    const elegida = r.estructura ? propias.find((f) => f.id === r.estructura?.id) : undefined;
    if (elegida && ocultas.get(elegida.id)) return { instalacionId: p.instalacionId, estado: "oculto" };
    if (!r.estructura) return { instalacionId: p.instalacionId, estado: "sin_costo" };
    try {
      const horas = p.horasSemanales ? Number(p.horasSemanales) : 42;
      const c = costoEmpleadorPorPersona(
        {
          sueldo: { capa: r.estructura },
          contrato: "indefinido",
          afp: "modelo",
          salud: { tipo: "fonasa" },
          jornadaMinutosSemanales: Math.round(horas * 60),
          mutualAdicional: mutual ?? 0,
          provisiones: { diasVacacionesCorridosAnuales: 21, baseVacaciones: "sin_gratificacion", baseIndemnizacion: "imponible", mesesAntiguedad: 0, probabilidadIndemnizacion: 1_000_000 },
        },
        juego,
      );
      return { instalacionId: p.instalacionId, estado: "ok", costoClp: c.costoEmpresaMensualClp };
    } catch {
      return { instalacionId: p.instalacionId, estado: "sin_costo" };
    }
  });
  return { costos, sinValoresLegales: false };
}
