import { liquidacionDelMes, type Liquidacion, type NovedadesLiquidacion } from "@opai/domain";

import type { TenantTx } from "@opai/db";

import type { ResumenAsistenciaPersona } from "../../../../modules/asistencia/capabilities/dias-resumen-periodo";

import type { Contexto } from "../types";

import { mezclarAsistenciaLiquidacion } from "./asistencia-liquidacion";
import type { PersonaDelMes } from "./costo-proyectado-datos";

const vacias = (): NovedadesLiquidacion =>
  ({ diasLicencia: 0, diasAusencia: 0, minutosExtra: 0, anticipos: 0, prestamos: 0, descuentos: 0 });

async function novedadesPorPersona(db: Contexto["db"] | TenantTx, periodoId: string) {
  const filas = await db.nominaNovedad.findMany({
    where: { periodoId, estado: "vigente" },
    select: { personaId: true, tipo: true, cantidad: true, montoClp: true },
  });
  const porPersona = new Map<string, NovedadesLiquidacion>();
  for (const f of filas) {
    const n = porPersona.get(f.personaId) ?? vacias();
    const cantidad = Number(f.cantidad ?? 0);
    const monto = f.montoClp ?? 0;
    if (f.tipo === "licencia") n.diasLicencia += cantidad;
    else if (f.tipo === "ausencia") n.diasAusencia += cantidad;
    else if (f.tipo === "horas_extra") n.minutosExtra += cantidad * 60;
    else if (f.tipo === "anticipo") n.anticipos += monto;
    else if (f.tipo === "prestamo") n.prestamos += monto;
    else if (f.tipo === "descuento") n.descuentos += monto;
    porPersona.set(f.personaId, n);
  }
  for (const n of porPersona.values()) {
    n.diasLicencia = Math.round(n.diasLicencia);
    n.diasAusencia = Math.round(n.diasAusencia);
    n.minutosExtra = Math.round(n.minutosExtra);
  }
  return porPersona;
}

type Juego = Parameters<typeof liquidacionDelMes>[1];

export type SalidaCalculoLiquidaciones = {
  calculadas: number;
  omitidas: { personaId: string; motivo: "sin_capa" | "oculta" | "error_calculo" }[];
  totalLiquido: number;
  advertencias: string[];
};

export async function calcularLiquidacionesPeriodo(
  db: Contexto["db"] | TenantTx,
  opts: {
    periodoId: string;
    personas: PersonaDelMes[];
    omitidasIniciales: SalidaCalculoLiquidaciones["omitidas"];
    mutual: number | null;
    juego: Juego;
    asistencia: Map<string, ResumenAsistenciaPersona>;
  },
): Promise<{ filas: { personaId: string; l: Liquidacion }[]; salida: SalidaCalculoLiquidaciones }> {
  const novedades = await novedadesPorPersona(db, opts.periodoId);
  const omitidas: SalidaCalculoLiquidaciones["omitidas"] = [...opts.omitidasIniciales];
  const filas = opts.personas.flatMap((p) => {
    try {
      const base = novedades.get(p.personaId) ?? vacias();
      const mezcla = mezclarAsistenciaLiquidacion(base, opts.asistencia.get(p.personaId));
      const l = liquidacionDelMes(
        {
          ...p,
          mutualAdicional: opts.mutual ?? 0,
          novedades: mezcla.novedades,
          ...(mezcla.diasPresentes !== undefined ? { diasPresentesAsistencia: mezcla.diasPresentes } : {}),
        },
        opts.juego,
      );
      const advertencias = [...l.advertencias, ...mezcla.advertencias];
      return [{ personaId: p.personaId, l: { ...l, advertencias } }];
    } catch {
      omitidas.push({ personaId: p.personaId, motivo: "error_calculo" });
      return [];
    }
  });
  const salida: SalidaCalculoLiquidaciones = {
    calculadas: filas.length,
    omitidas,
    totalLiquido: filas.reduce((s, f) => s + f.l.liquido, 0),
    advertencias: opts.mutual == null ? ["Mutual adicional sin confirmar: se usa 0 %."] : [],
  };
  return { filas, salida };
}