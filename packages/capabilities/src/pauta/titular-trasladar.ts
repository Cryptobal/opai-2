import { z } from "zod";

import { sumarDias } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { dondePersona } from "../core/maestros/alcance";
import { crearVinculo } from "../core/maestros/vinculos-crear";
import { exigirEdicionVinculo } from "../core/maestros/vinculos-validacion";
import { vistaVinculo } from "../core/maestros/vinculos-vista";
import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { aFechaDb, diaSchema, fechaIso, hoy, PERMISO_WRITE, puestoParaPauta } from "./comun";
import { fijarSerieInterna, salidaSerieSchema } from "./series-nucleo";
import { sincronizarTitular } from "./titular-sincronizar";
import { primerosDias } from "./titular-vista";

const entradaSchema = z.object({
  personaId: uuidSchema,
  puestoDestinoId: uuidSchema,
  /** Rige desde: el guardia empieza en el puesto nuevo y la serie y el vínculo anteriores se cierran el día antes. */
  desde: diaSchema,
  inicioCiclo: diaSchema,
  motivo: z.string().trim().min(5).max(500),
});

const salidaSchema = z.object({
  personaId: z.string(),
  mismaInstalacion: z.boolean(),
  puestosOrigen: z.array(z.object({ puestoId: z.string(), puesto: z.string(), serieHasta: z.string() })),
  vinculoTerminado: z.object({ id: z.string(), termino: z.string() }).nullable(),
  vinculoNuevo: z.boolean(),
  serie: salidaSerieSchema.shape.serie,
  primerosDias: z.array(z.object({ fecha: z.string(), trabaja: z.boolean() })),
});

/** Traslada a un guardia a otro puesto (de la misma instalación o de otra) en una sola transacción. */
export const titularTrasladar = defineCapability({
  id: "pauta.titular.trasladar",
  descripcion:
    "IRREVERSIBLE: traslada a un guardia a otro puesto desde una fecha. Cierra sus series de pauta anteriores, y si el puesto es de otra instalación termina su vínculo el día antes y crea el nuevo (con borrador de anexo para RR. HH.); luego lo deja como titular del puesto nuevo. La vista previa muestra lo que se cierra, el vínculo y los primeros días.",
  permiso: PERMISO_WRITE,
  input: entradaSchema,
  output: salidaSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const persona = await ctx.db.persona.findFirst({
      where: { id: i.personaId, AND: [dondePersona(ctx)], estado: "activa", archivadaEn: null },
      select: { id: true },
    });
    if (!persona) throw noEncontrado("La persona");
    const v0 = await ctx.db.vinculoLaboral.findFirst({ where: { personaId: i.personaId, estado: "vigente" } });
    if (!v0?.instalacionId) throw reglaDeNegocio("La persona no tiene un vínculo vigente con una instalación.");
    const destino = await puestoParaPauta(ctx, i.puestoDestinoId);
    if (!destino.patronId) throw reglaDeNegocio("El puesto de destino no tiene patrón de turno: elígelo en su ficha antes de trasladar.");
    const misma = v0.instalacionId === destino.instalacionId;
    if (!misma) exigirEdicionVinculo(ctx);
    if (i.desde < (await hoy(ctx))) throw reglaDeNegocio("El traslado no puede regir antes de hoy: no se modifican los días pasados.");
    const series = await ctx.db.seriePauta.findMany({
      where: { titularPersonaId: i.personaId, OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: aFechaDb(i.desde) } }] },
    });
    if (series.some((s) => s.puestoId === destino.id)) throw reglaDeNegocio("Esa persona ya es titular de ese puesto.");
    if (series.some((s) => fechaIso(s.vigenteDesde) > i.desde))
      throw reglaDeNegocio("La persona tiene una asignación futura en otro puesto: quítala antes de trasladarla.");
    const termino = sumarDias(i.desde, -1);
    if (!misma && aFechaDb(termino) < v0.inicio) throw reglaDeNegocio("El vínculo actual empieza después del día anterior al traslado.");
    const origenes = await ctx.db.puesto.findMany({
      where: { id: { in: series.map((s) => s.puestoId) }, estado: "activo" },
      select: { id: true, nombre: true },
    });
    const activos = new Map(origenes.map((p) => [p.id, p.nombre]));
    const cerrar = series.filter((s) => activos.has(s.puestoId));
    const cierres = Object.fromEntries(series.map((s) => [s.puestoId, termino]));
    const patron = await ctx.db.patronTurno.findUniqueOrThrow({ where: { id: destino.patronId } });
    const nueva = (c: Contexto, op: { dryRun: boolean }) =>
      fijarSerieInterna(c, { puestoId: destino.id, patronId: destino.patronId!, inicioCiclo: i.inicioCiclo, titularPersonaId: i.personaId, desde: i.desde }, {
        dryRun: op.dryRun,
        detalle: { via: "traslado" },
        simular: { cierres, sinVinculo: !misma },
        enTransaccion: (tx, cx, r) => sincronizarTitular(tx, cx, r),
      });
    const cierre = (c: Contexto, s: (typeof cerrar)[number], dry: boolean) =>
      fijarSerieInterna(c, { puestoId: s.puestoId, patronId: s.patronId, inicioCiclo: fechaIso(s.inicioCiclo), titularPersonaId: null, desde: i.desde }, {
        dryRun: dry,
        quitar: true,
        detalle: { via: "traslado" },
        enTransaccion: (tx, cx, r) => sincronizarTitular(tx, cx, r),
      });
    const salida = (serie: z.output<typeof salidaSerieSchema>["serie"]) => ({
      personaId: i.personaId,
      mismaInstalacion: misma,
      puestosOrigen: cerrar.map((s) => ({ puestoId: s.puestoId, puesto: activos.get(s.puestoId) ?? "", serieHasta: termino })),
      vinculoTerminado: misma ? null : { id: v0.id, termino },
      vinculoNuevo: !misma,
      serie,
      primerosDias: primerosDias(patron, i.inicioCiclo, i.desde),
    });
    if (dryRun) {
      for (const s of cerrar) await cierre(ctx, s, true);
      return salida((await nueva(ctx, { dryRun: true })).serie);
    }
    const r = await ctx.transaccion(async (tx) => {
      const dentro = { ...ctx, db: tx };
      // Primero el vínculo anterior (así el cierre de las series no toca su puesto) y luego las series.
      if (!misma) {
        await tx.vinculoLaboral.update({
          where: { id: v0.id },
          data: { termino: aFechaDb(termino), motivoTermino: i.motivo, estado: "terminado" },
        });
        await ctx.eventos.emitir(tx, { tipo: "core.vinculo.terminado", entidadTipo: "vinculo", entidadId: v0.id, payload: { personaId: i.personaId, termino } });
      }
      for (const s of cerrar) await cierre(dentro, s, false);
      if (!misma) {
        if (!v0.horasSemanales || !v0.distribucion) throw reglaDeNegocio("El vínculo actual no tiene jornada pactada: complétala antes de trasladar.");
        const creado = await crearVinculo(dentro, tx, i.personaId, {
          cargoId: v0.cargoId,
          instalacionId: destino.instalacionId,
          puestoId: destino.id,
          horasSemanales: v0.horasSemanales,
          distribucion: v0.distribucion,
          tipo: v0.tipo as "indefinido" | "plazo_fijo" | "por_obra" | "honorarios",
          inicio: i.desde,
        });
        // El cambio de instalación sí cambia las condiciones: borrador de anexo para RR. HH. (consumidor de anexos).
        await ctx.eventos.emitir(tx, {
          tipo: "core.vinculo.actualizado",
          entidadTipo: "vinculo",
          entidadId: creado.id,
          payload: { personaId: i.personaId, antes: vistaVinculo(v0), despues: vistaVinculo(creado), campos: ["instalacionId"] },
        });
      }
      return nueva(dentro, { dryRun: false });
    });
    return salida(r.serie);
  },
});
