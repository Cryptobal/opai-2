import { z } from "zod";

import {
  CONCEPTOS_COSTO_PROYECTADO,
  costoProyectadoDelMes,
  fechaAnticipoQuincenal,
  mesesQueCubren,
  previredPorDefecto,
  type ItemCostoProyectado,
} from "@opai/domain";

import { defineCapability } from "../define";
import { ajuste } from "../core/config";
import { dia, diaSchema } from "../core/maestros/comun";
import { mutualAdicionalTenant } from "../core/remuneraciones";
import type { Contexto } from "../types";
import { PERMISO_READ, ajusteNum } from "./comun";
import { cargarBase, finMes, inicioMes, juegoDelMes, ocultasDe, personasDelMes } from "./costo-proyectado-datos";

const MAX_MESES = 6;

/** La misma fecha n meses después, con el día acotado al largo del mes (31-ago + 6 → 28-feb). */
const masMeses = (d: string, n: number) => {
  const [a, m, dd] = d.split("-").map(Number) as [number, number, number];
  const total = a * 12 + (m - 1) + n;
  return fechaAnticipoQuincenal(Math.floor(total / 12), (total % 12) + 1, dd);
};

async function ajusteBool(ctx: Contexto, clave: string): Promise<boolean> {
  try {
    return (await ajuste<boolean>(ctx, "nomina", clave)) === true;
  } catch {
    return false;
  }
}

/** Fechas de Previred verificadas en el calendario de obligaciones, por «aaaa-m». */
async function plazosPrevired(ctx: Contexto, anios: number[]) {
  const filas = await ctx.db.nominaObligacion.findMany({
    where: { tipo: "previred", anio: { in: anios }, plazoVerificado: true },
    select: { anio: true, mes: true, fechaLimite: true },
  });
  return new Map(filas.flatMap((o) => (o.fechaLimite ? [[`${o.anio}-${o.mes}`, dia(o.fechaLimite) ?? ""] as const] : [])));
}

/** Costo de remuneraciones proyectado por concepto y fecha de pago, para el flujo de caja (CAR-344). */
export const costoProyectadoListar = defineCapability({
  id: "nomina.costo_proyectado.listar",
  descripcion:
    "Proyecta el costo de remuneraciones por concepto (sueldos líquidos, anticipo de quincena, cotizaciones de Previred y turnos extra) y fecha de pago, entre dos fechas (máximo 6 meses). Usa el personal con contrato vigente y su estructura de sueldo; es una estimación, no una liquidación. Solo devuelve totales y cuántas personas suma cada uno, nunca datos de una persona.",
  permiso: PERMISO_READ,
  input: z
    .object({
      desde: diaSchema,
      hasta: diaSchema,
      cursor: z.string().regex(/^\d{1,6}$/, "Cursor inválido.").optional().describe("Posición devuelta en «siguiente»."),
      limite: z.number().int().min(1).max(200).default(100),
    })
    .refine((i) => i.hasta >= i.desde, { message: "«hasta» no puede ser anterior a «desde».", path: ["hasta"] })
    .refine((i) => i.hasta <= masMeses(i.desde, MAX_MESES), { message: "El rango no puede superar 6 meses.", path: ["hasta"] }),
  output: z.object({
    items: z.array(
      z.object({
        fecha: z.string().describe("Fecha de pago (aaaa-mm-dd)."),
        concepto: z.enum(CONCEPTOS_COSTO_PROYECTADO),
        monto: z.number().int().describe("CLP entero."),
        personas: z.number().int().describe("Cuántas personas suma el total."),
        estimado: z.boolean(),
      }),
    ),
    siguiente: z.string().nullable(),
    advertencias: z.array(z.string()).describe("Qué quedó fuera de la proyección y por qué, sin identificar personas."),
  }),
  efecto: "lectura",
  dryRun: false,
  // Lectura auditada sin IDs: la salida son totales, nunca identifica personas (NÚCLEO-H).
  auditarLectura: () => [],
  async handler(ctx, { desde, hasta, cursor, limite }) {
    const meses = mesesQueCubren(desde, hasta);
    const [primero, ultimo] = [meses[0], meses[meses.length - 1]];
    const advertencias: string[] = [
      "Turnos extra: aún no tienen monto en OPAI (CAR-96), por eso no se proyectan.",
      "Impuesto único: se descuenta del líquido y se paga con el F29; no está en estos totales.",
    ];
    const items: ItemCostoProyectado[] = [];
    if (primero && ultimo) {
      const base = await cargarBase(ctx, inicioMes(primero), finMes(ultimo));
      const juegos = await Promise.all(meses.map((m) => juegoDelMes(ctx, finMes(m))));
      const algunJuego = juegos.some((j) => typeof j !== "string");
      // Sin valores legales no se usa ningún monto: ocultasDe auditaría una lectura de sueldos.
      const ocultas = algunJuego && base.estructuras.length ? await ocultasDe(ctx, base.estructuras) : new Map<string, boolean>();
      const [mutual, sueldoDia, mesSig, previred] = await Promise.all([
        mutualAdicionalTenant(ctx),
        ajusteNum(ctx, "sueldo_dia_pago", 31),
        ajusteBool(ctx, "sueldo_pago_mes_siguiente"),
        plazosPrevired(ctx, [...new Set(meses.map((m) => m.anio))]),
      ]);
      meses.forEach((m, i) => {
        const juego = juegos[i];
        const etiqueta = inicioMes(m).slice(0, 7) + (i === 0 ? " (mes anterior)" : "");
        if (juego === undefined || typeof juego === "string") {
          advertencias.push(`${etiqueta}: faltan valores legales (${juego ?? "indicadores"}); el mes no se proyecta.`);
          return;
        }
        const g = personasDelMes(base, m, ocultas);
        const previredFecha = previred.get(`${m.anio}-${m.mes}`) ?? previredPorDefecto(m);
        const r = costoProyectadoDelMes(m, g.personas, juego, mutual ?? 0, { sueldoDia, sueldoMesSiguiente: mesSig, previredFecha });
        items.push(...r.items);
        const fuera = g.sinCapa + r.sinCalculo;
        if (fuera) advertencias.push(`${etiqueta}: ${fuera} persona(s) sin estructura de sueldo completa no se proyectan.`);
        if (g.ocultas) advertencias.push(`${etiqueta}: ${g.ocultas} persona(s) con sueldo oculto por permisos no se proyectan.`);
      });
      if (mutual == null) advertencias.push("Mutual adicional sin confirmar: se usa 0 %.");
    }
    const enRango = items
      .filter((i) => i.fecha >= desde && i.fecha <= hasta)
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.concepto.localeCompare(b.concepto));
    const inicio = Number(cursor ?? 0);
    const pagina = enRango.slice(inicio, inicio + limite);
    const siguiente = inicio + limite < enRango.length ? String(inicio + limite) : null;
    return { items: pagina, siguiente, advertencias };
  },
});
