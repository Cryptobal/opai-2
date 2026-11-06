import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { dondePuesto } from "../core/maestros/alcance";
import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { candidatosDeInstalacion } from "./candidatos";
import { fechaIso, hoy, PERMISO_READ } from "./comun";
import { nombresDePersonas } from "./nombres";

const itemSchema = z.object({
  serieId: z.string(),
  titularId: z.string().nullable(),
  titular: z.string().nullable(),
  patron: z.string(),
  inicioCiclo: z.string(),
  desde: z.string(),
  hasta: z.string().nullable(),
  /** Quién fijó la serie y cuándo, según la bitácora de la pauta; null en series anteriores a CAR-206. */
  fijadaPor: z.string().nullable(),
  fijadaEn: z.string().nullable(),
});

/** Titulares de un puesto a lo largo del tiempo, armados con sus series y la bitácora de la pauta. */
export const titularesListar = defineCapability({
  id: "pauta.titulares.listar",
  descripcion:
    "Titulares de un puesto con su desde y hasta, quién los fijó y cuándo, de la serie vigente hacia atrás, más el titular de hoy y los guardias que se pueden elegir (con vínculo vigente en la instalación).",
  permiso: PERMISO_READ,
  input: z.object({ puestoId: uuidSchema }),
  output: z.object({
    puestoId: z.string(),
    patronId: z.string().nullable(),
    titularActualId: z.string().nullable(),
    items: z.array(itemSchema),
    candidatos: z.array(z.object({ id: z.string(), nombre: z.string() })),
  }),
  auditarLectura: (s) => [
    ...new Set([...s.items.map((i) => i.titularId), ...s.candidatos.map((c) => c.id)].filter((i): i is string => !!i)),
  ],
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { puestoId }) {
    // También un puesto inactivo: su historial se puede consultar (no se le asigna).
    const puesto = await ctx.db.puesto.findFirst({
      where: { id: puestoId, AND: [dondePuesto(ctx)] },
      select: { id: true, instalacionId: true, patronId: true, estado: true },
    });
    if (!puesto) throw noEncontrado("El puesto");
    const [series, lineas, candidatos, hoyCivil] = await Promise.all([
      ctx.db.seriePauta.findMany({
        where: { puestoId },
        orderBy: { vigenteDesde: "desc" },
        take: 50,
      }),
      ctx.db.historialPauta.findMany({
        where: { puestoId, accion: "serie_fijada" },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      puesto.estado === "activo" ? candidatosDeInstalacion(ctx, puesto.instalacionId) : Promise.resolve([]),
      hoy(ctx),
    ]);
    const nombres = await nombresDePersonas(ctx, series.map((s) => s.titularPersonaId));
    const patrones = new Map(
      (
        await ctx.db.patronTurno.findMany({
          where: { id: { in: [...new Set(series.map((s) => s.patronId))] } },
          select: { id: true, nombre: true },
        })
      ).map((p) => [p.id, p.nombre]),
    );
    const items = series.map((s) => {
      const desde = fechaIso(s.vigenteDesde);
      // Por serieId; las líneas anteriores a CAR-206 no lo traen y se emparejan por la fecha de inicio.
      const l =
        lineas.find((x) => (x.detalle as { serieId?: string } | null)?.serieId === s.id) ??
        lineas.find((x) => !(x.detalle as { serieId?: string } | null)?.serieId && fechaIso(x.fechaDesde) === desde);
      const nombre = (l?.detalle as { actorNombre?: string | null } | null)?.actorNombre;
      return {
        serieId: s.id,
        titularId: s.titularPersonaId,
        titular: s.titularPersonaId ? (nombres.get(s.titularPersonaId) ?? null) : null,
        patron: patrones.get(s.patronId) ?? "Patrón",
        inicioCiclo: fechaIso(s.inicioCiclo),
        desde,
        hasta: s.vigenteHasta ? fechaIso(s.vigenteHasta) : null,
        fijadaPor: typeof nombre === "string" ? nombre : null,
        fijadaEn: l ? l.createdAt.toISOString() : null,
      };
    });
    const vigente = items.find((i) => i.desde <= hoyCivil && (i.hasta === null || i.hasta >= hoyCivil));
    return {
      puestoId,
      patronId: puesto.patronId,
      titularActualId: vigente?.titularId ?? null,
      items,
      candidatos,
    };
  },
});
