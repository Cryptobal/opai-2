// Tablero del cierre de mes: los borradores que generaron las programaciones, por etapa (BRIEF-33 · CAR-167).
import { z } from "zod";

import { ETAPAS_CIERRE, etapaCierre, resumirEtapas } from "@opai/domain";

import { defineCapability } from "../define";
import { PERMISO_READ } from "./comun";
import { aSeguimiento, iso, itemCierreSchema, periodoMesSchema, type ItemCierre } from "./cierre-esquemas";

export const cierreTablero = defineCapability({
  id: "finanzas.cierre.tablero",
  descripcion:
    "Muestra el cierre de facturación de un mes: los borradores que generaron las programaciones, en su etapa (falta OC/HES, observado, por enviar, esperando OK, listo para emitir, emitido), con totales por etapa.",
  permiso: PERMISO_READ,
  input: z.object({ periodo: periodoMesSchema }),
  output: z.object({
    periodo: z.string(),
    etapas: z.array(z.object({ etapa: z.enum(ETAPAS_CIERRE), cantidad: z.number().int(), total: z.number() })),
    items: z.array(itemCierreSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [...new Set(s.items.flatMap((i) => (i.cuentaId ? [i.cuentaId] : [])))],
  async handler(ctx, input) {
    const corridas = await ctx.db.ventasProgramacionCorrida.findMany({
      where: { periodo: { startsWith: input.periodo }, documentoId: { not: null } },
      include: {
        programacion: { select: { id: true, nombre: true } },
        documento: { include: { seguimientoCierre: true } },
      },
      orderBy: [{ periodo: "asc" }, { id: "asc" }],
      take: 500,
    });
    const cuentaIds = [...new Set(corridas.flatMap((c) => (c.documento ? [c.documento.cuentaId] : [])))];
    const cuentas = cuentaIds.length
      ? await ctx.db.cuenta.findMany({ where: { id: { in: cuentaIds } }, select: { id: true, nombre: true } })
      : [];
    const nombre = new Map(cuentas.map((c) => [c.id, c.nombre]));
    const items: ItemCierre[] = corridas.flatMap((c) => {
      const d = c.documento;
      if (!d) return [];
      const seg = d.seguimientoCierre;
      return [
        {
          documentoId: d.id,
          programacionId: c.programacion.id,
          programacionNombre: c.programacion.nombre,
          cuentaId: d.cuentaId,
          cuentaNombre: nombre.get(d.cuentaId) ?? null,
          periodo: c.periodo,
          tipoDte: d.tipoDte,
          folio: d.folio,
          estadoDte: d.estadoDte,
          montoTotal: d.montoTotal,
          etapa: etapaCierre(d.estadoDte, aSeguimiento(seg)),
          estado: (seg?.estado ?? "pendiente") as ItemCierre["estado"],
          requiereOcHes: seg?.requiereOcHes ?? false,
          ordenCompra: seg?.ordenCompra ?? null,
          hes: seg?.hes ?? null,
          observacion: seg?.observacion ?? null,
          enviadaEn: iso(seg?.enviadaEn),
          recordadaEn: iso(seg?.recordadaEn),
          okEn: iso(seg?.okEn),
          observadaEn: iso(seg?.observadaEn),
        },
      ];
    });
    return { periodo: input.periodo, etapas: resumirEtapas(items), items };
  },
});
