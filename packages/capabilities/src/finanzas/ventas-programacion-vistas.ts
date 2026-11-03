import { z } from "zod";

const lineaSchema = z.object({
  id: z.string(),
  glosa: z.string(),
  monto: z.number().int(),
});

const destinatarioSchema = z.object({
  contactoId: z.string(),
  nombres: z.string(),
  apellidos: z.string(),
  email: z.string().nullable(),
});

export const programacionSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  activa: z.boolean(),
  cuentaId: z.string().nullable(),
  cuentaNombre: z.string(),
  instalacionId: z.string().nullable(),
  instalacionNombre: z.string().nullable(),
  tipoDte: z.union([z.literal(33), z.literal(34), z.literal(56), z.literal(61)]),
  diaGeneracion: z.number().int(),
  moneda: z.string(),
  montoTotal: z.number().int(),
  plazoPagoDias: z.number().int(),
  proximaEjecucionEn: z.string().nullable(),
  destinatarios: z.array(destinatarioSchema),
  lineas: z.array(lineaSchema),
});

export type FilaProg = {
  id: string;
  nombre: string;
  activa: boolean;
  cuentaId: string | null;
  instalacionId: string | null;
  tipoDte: number;
  diaGeneracion: number;
  moneda: string;
  plazoPagoDias: number;
  proximaEjecucionEn: Date | null;
  receptorRazonSocial: string | null;
  lineas: {
    id: string;
    glosa: string;
    cantidad: { toNumber(): number };
    precioUnitarioClp: bigint | null;
    descuentoPct: number;
  }[];
  destinatarios: { contactoId: string | null; orden: number }[];
};

/** Total CLP de la línea (cantidad × precio − descuento). Las líneas en UF se muestran en la ficha de A4. */
function montoLineaClp(l: FilaProg["lineas"][number]): number {
  if (l.precioUnitarioClp === null) return 0;
  const bruto = l.cantidad.toNumber() * Number(l.precioUnitarioClp);
  return Math.round(bruto * (1 - l.descuentoPct / 10_000));
}

export async function enriquecerProgramaciones(
  ctx: { db: { contacto: { findMany: (args: object) => Promise<{ id: string; nombres: string; apellidos: string; email: string | null }[]> } } },
  filas: FilaProg[],
  cuentas: Map<string, string>,
  instalaciones: Map<string, string>,
) {
  const contactoIds = [
    ...new Set(filas.flatMap((f) => f.destinatarios.flatMap((d) => (d.contactoId ? [d.contactoId] : [])))),
  ];
  const contactos = contactoIds.length
    ? await ctx.db.contacto.findMany({
        where: { id: { in: contactoIds } },
        select: { id: true, nombres: true, apellidos: true, email: true },
      })
    : [];
  const contactoMap = new Map(contactos.map((c) => [c.id, c]));
  return filas.map((f) => {
    const lineas = f.lineas.map((l) => ({ id: l.id, glosa: l.glosa, monto: montoLineaClp(l) }));
    const montoTotal = lineas.reduce((a, l) => a + l.monto, 0);
    return {
      id: f.id,
      nombre: f.nombre,
      activa: f.activa,
      cuentaId: f.cuentaId,
      cuentaNombre: (f.cuentaId ? cuentas.get(f.cuentaId) : null) ?? f.receptorRazonSocial ?? "—",
      instalacionId: f.instalacionId,
      instalacionNombre: f.instalacionId ? (instalaciones.get(f.instalacionId) ?? null) : null,
      tipoDte: f.tipoDte as 33 | 34 | 56 | 61,
      diaGeneracion: f.diaGeneracion,
      moneda: f.moneda,
      montoTotal,
      plazoPagoDias: f.plazoPagoDias,
      proximaEjecucionEn: f.proximaEjecucionEn ? f.proximaEjecucionEn.toISOString().slice(0, 10) : null,
      destinatarios: f.destinatarios.flatMap((d) => {
        if (!d.contactoId) return [];
        const c = contactoMap.get(d.contactoId);
        return [
          {
            contactoId: d.contactoId,
            nombres: c?.nombres ?? "",
            apellidos: c?.apellidos ?? "",
            email: c?.email ?? null,
          },
        ];
      }),
      lineas,
    };
  });
}
