import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { aFecha, definidos, diaSchema, escribirConEvento, opcionalAFecha } from "./comun";
import { cargoParaVinculo, crearVinculo } from "./personas-escritura";
import { personaDe } from "./personas-vista";
import { camposVinculo, vinculoSchema, vistaVinculo } from "./vinculos-vista";
import { exigirNoAnonimizado } from "./anonimizado";

async function vinculoDe(ctx: Contexto, id: string) {
  const v = await ctx.db.vinculoLaboral.findUnique({ where: { id } });
  if (!v) throw noEncontrado("El vínculo");
  return v;
}

export const vinculosList = defineCapability({
  id: "core.vinculos.list",
  descripcion:
    "Historial de vínculos laborales de una persona (vigente y terminados), del más reciente al más antiguo.",
  permiso: PERMISOS_CORE.personasRead,
  input: z.object({ personaId: uuidSchema }),
  output: z.array(vinculoSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.vinculoLaboral.findMany({
      where: { personaId: input.personaId },
      orderBy: { inicio: "desc" },
    });
    return filas.map(vistaVinculo);
  },
});

export const vinculosCreate = defineCapability({
  id: "core.vinculos.create",
  descripcion:
    "Crea un vínculo laboral (cargo, tipo de contrato, inicio). Si la persona ya tiene uno vigente responde con error: primero hay que terminarlo.",
  permiso: PERMISOS_CORE.personasManage,
  input: z.object({ personaId: uuidSchema, ...camposVinculo }),
  output: vinculoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { personaId, ...v }, { dryRun }) {
    const p = await personaDe(ctx, personaId);
    exigirNoAnonimizado(p, "La persona");
    if (p.archivadaEn) throw reglaDeNegocio("La persona está archivada.");
    const vigente = await ctx.db.vinculoLaboral.findFirst({
      where: { personaId, estado: "vigente" },
    });
    if (vigente)
      throw reglaDeNegocio(
        "La persona ya tiene un vínculo vigente: primero termínalo (core.vinculos.terminar).",
      );
    await cargoParaVinculo(ctx, v.cargoId);
    if (dryRun) {
      return vistaVinculo({
        ...v,
        id: "",
        personaId,
        inicio: aFecha(v.inicio),
        termino: opcionalAFecha(v.termino) ?? null,
      });
    }
    const creado = await ctx.transaccion(async (tx) => {
      const r = await crearVinculo(ctx, tx, personaId, v);
      if (p.estado !== "activa")
        await tx.persona.update({ where: { id: personaId }, data: { estado: "activa" } });
      return r;
    });
    return vistaVinculo(creado);
  },
});

export const vinculosUpdate = defineCapability({
  id: "core.vinculos.update",
  descripcion:
    "Corrige un vínculo vigente (cargo, tipo de contrato o término pactado). Para terminarlo, usa core.vinculos.terminar.",
  permiso: PERMISOS_CORE.personasManage,
  input: z.object({ id: uuidSchema, ...z.object(camposVinculo).partial().shape }),
  output: vinculoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const actual = await vinculoDe(ctx, id);
    if (actual.estado !== "vigente") throw reglaDeNegocio("Solo se corrige un vínculo vigente.");
    if (cambios.cargoId) await cargoParaVinculo(ctx, cambios.cargoId);
    const data = definidos({
      ...cambios,
      inicio: opcionalAFecha(cambios.inicio) ?? undefined,
      termino: opcionalAFecha(cambios.termino),
    });
    if (dryRun) return vistaVinculo({ ...actual, ...data });
    const r = await ctx.transaccion(async (tx) => {
      const v = await tx.vinculoLaboral.update({ where: { id }, data });
      await ctx.eventos.emitir(tx, {
        tipo: "core.persona.actualizada",
        entidadTipo: "persona",
        entidadId: v.personaId,
        payload: { vinculo: id, campos: Object.keys(data) },
      });
      return v;
    });
    return vistaVinculo(r);
  },
});

export const vinculosTerminar = defineCapability({
  id: "core.vinculos.terminar",
  descripcion:
    "IRREVERSIBLE: termina un vínculo laboral con fecha de término y motivo. Si no le quedan vínculos vigentes, la persona pasa a inactiva.",
  permiso: PERMISOS_CORE.personasManage,
  input: z.object({
    id: uuidSchema,
    termino: diaSchema,
    motivo: z.string().trim().min(5).max(500),
  }),
  output: vinculoSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const v = await vinculoDe(ctx, input.id);
    if (v.estado !== "vigente") throw reglaDeNegocio("El vínculo ya está terminado.");
    const termino = aFecha(input.termino);
    if (termino < v.inicio) throw reglaDeNegocio("El término es anterior al inicio del vínculo.");
    const data = { termino, motivoTermino: input.motivo, estado: "terminado" };
    if (dryRun) return vistaVinculo({ ...v, ...data });
    const r = await escribirConEvento(
      ctx,
      {
        tipo: "core.vinculo.terminado",
        entidadTipo: "vinculo",
        payload: () => ({ personaId: v.personaId, termino: input.termino }),
      },
      async (tx) => {
        const t = await tx.vinculoLaboral.update({ where: { id: v.id }, data });
        const quedan = await tx.vinculoLaboral.count({
          where: { personaId: v.personaId, estado: "vigente" },
        });
        if (!quedan)
          await tx.persona.update({ where: { id: v.personaId }, data: { estado: "inactiva" } });
        return t;
      },
    );
    return vistaVinculo(r);
  },
});
