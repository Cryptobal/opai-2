import { z } from "zod";

import type { Instrumentos } from "../domain/motor/tipos";

const pct = z.number().int().min(0).max(1_000_000);
const entero = z.number().int().min(0).max(1_000_000_000_000);

/** Esquema de los instrumentos financieros de una versión (R57, R60); montos UF y tasas escalados. */
export const instrumentosSchema = z.object({
  financiero: z.object({ habilitado: z.boolean(), tasaPct: pct }),
  garantia: z.object({
    habilitada: z.boolean(),
    modo: z.enum(["porcentaje", "fija"]),
    meses: z.number().int().min(1).max(120),
    contratoPct: pct,
    tasaAnualPct: pct,
    administracionPct: pct,
    montoUf: entero,
    incluirUnicos: z.boolean(),
  }),
  rc: z.object({
    habilitada: z.boolean(),
    modo: z.enum(["prima", "tasa"]),
    primaAnualUf: entero,
    aseguradoUf: entero,
    tasaAnualPct: pct,
    asignacionPct: pct,
    plazo: z.enum(["anual", "contrato", "meses"]),
    meses: z.number().int().min(1).max(120),
  }),
});

/** Parcial por instrumento: lo que no viene queda con el valor por defecto del tenant. */
export const instrumentosParcialSchema = z.object({
  financiero: instrumentosSchema.shape.financiero.partial().optional(),
  garantia: instrumentosSchema.shape.garantia.partial().optional(),
  rc: instrumentosSchema.shape.rc.partial().optional(),
});

/** Lee los instrumentos guardados; un JSON inválido se ignora (vuelve al defecto) en vez de romper. */
export function leerInstrumentos(raw: string | null | undefined): Instrumentos | null {
  if (!raw) return null;
  try {
    const r = instrumentosSchema.safeParse(JSON.parse(raw));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

/** Instrumentos que pasa el mapeo al motor: los de la versión, o nada (el motor usa los del modelo). */
export function instrumentosDeVersion(raw: string | null | undefined): { instrumentos?: Instrumentos } {
  const i = leerInstrumentos(raw);
  return i ? { instrumentos: i } : {};
}

/** Combina el parcial pedido con la base (la de la versión o la del modelo). */
export function combinarInstrumentos(
  base: Instrumentos,
  cambio: z.infer<typeof instrumentosParcialSchema>,
): Instrumentos {
  return instrumentosSchema.parse({
    financiero: { ...base.financiero, ...cambio.financiero },
    garantia: { ...base.garantia, ...cambio.garantia },
    rc: { ...base.rc, ...cambio.rc },
  });
}
