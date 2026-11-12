export { vinculosTerminar } from "./vinculos-terminar";
import {
  bloquearVinculo,
  exigirEdicionVinculo,
  reclutadorPorDefecto,
  validarDestino,
  validarReclutador,
} from "./vinculos-validacion";
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { dondePersona } from "./alcance";
import { aFecha, definidos, opcionalAFecha } from "./comun";
import { cargoParaVinculo, crearVinculo } from "./personas-escritura";
import { personaDe } from "./personas-vista";
import { camposVinculo, vinculoSchema, vistaVinculo } from "./vinculos-vista";
import { bloquearNoAnonimizado, exigirNoAnonimizado } from "./anonimizado";

export async function vinculoDe(ctx: Contexto, id: string) {
  const v = await ctx.db.vinculoLaboral.findFirst({
    where: { id, persona: dondePersona(ctx) },
  });
  if (!v) throw noEncontrado("El vínculo");
  return v;
}

export const vinculosList = defineCapability({
  auditarLectura: (s) => s.map((v) => v.id),
  id: "core.vinculos.list",
  descripcion:
    "Historial de vínculos laborales de una persona (vigente y terminados), del más reciente al más antiguo.",
  permiso: PERMISOS_CORE.vinculosRead,
  input: z.object({ personaId: uuidSchema }),
  output: z.array(vinculoSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.vinculoLaboral.findMany({
      // El historial es visible solo si la persona está en el alcance del actor (vía su vínculo).
      where: { personaId: input.personaId, persona: dondePersona(ctx) },
      orderBy: { inicio: "desc" },
    });
    return filas.map(vistaVinculo);
  },
});

export const vinculosCreate = defineCapability({
  id: "core.vinculos.create",
  descripcion:
    "Crea un vínculo laboral con instalación, puesto opcional y jornada pactada. Si la persona ya tiene uno vigente responde con error: primero hay que terminarlo.",
  permiso: PERMISOS_CORE.vinculosManage,
  input: z.object({ personaId: uuidSchema, ...camposVinculo }),
  output: vinculoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { personaId, ...v }, { dryRun }) {
    exigirEdicionVinculo(ctx);
    await validarDestino(ctx, v);
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
      // La vista previa muestra y valida el mismo «Reclutado por» que dejaría la escritura.
      if (v.reclutadoPorId) await validarReclutador(ctx, v.reclutadoPorId);
      return vistaVinculo({
        ...v,
        reclutadoPorId: v.reclutadoPorId === undefined ? reclutadorPorDefecto(ctx) : v.reclutadoPorId,
        id: "",
        personaId,
        inicio: aFecha(v.inicio),
        termino: opcionalAFecha(v.termino) ?? null,
      });
    }
    const creado = await ctx.transaccion(async (tx) => {
      await bloquearNoAnonimizado(tx, "persona", personaId);
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
    "Corrige un vínculo vigente, su instalación, puesto, jornada pactada y quién reclutó a la persona (esto último también en un vínculo terminado). Para terminarlo, usa core.vinculos.terminar.",
  permiso: PERMISOS_CORE.vinculosManage,
  input: z.object({
    id: uuidSchema,
    versionEsperada: z.string().optional(),
    ...z.object(camposVinculo).partial().shape,
  }),
  output: vinculoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, versionEsperada, ...cambios }, { dryRun }) {
    exigirEdicionVinculo(ctx);
    if (!dryRun) await bloquearVinculo(ctx, id);
    const actual = await vinculoDe(ctx, id);
    if (versionEsperada && actual.updatedAt.toISOString() !== versionEsperada)
      throw conflicto("El vínculo cambió. Vuelve a abrirlo y revisa el cambio.");
    // Corregir solo «Reclutado por» vale también en un vínculo terminado: la retención los mide.
    const campos = Object.keys(cambios).filter((k) => cambios[k as keyof typeof cambios] !== undefined);
    const soloReclutador = campos.length === 1 && campos[0] === "reclutadoPorId";
    if (!soloReclutador) await validarDestino(ctx, { ...actual, ...cambios });
    const termino =
      cambios.termino === undefined ? actual.termino : opcionalAFecha(cambios.termino);
    if (termino && termino < (cambios.inicio ? aFecha(cambios.inicio) : actual.inicio))
      throw reglaDeNegocio("El término es anterior al inicio.");
    if (actual.estado !== "vigente" && !soloReclutador)
      throw reglaDeNegocio("Solo se corrige un vínculo vigente (de uno terminado, solo quién reclutó).");
    if (cambios.cargoId) await cargoParaVinculo(ctx, cambios.cargoId);
    await validarReclutador(ctx, cambios.reclutadoPorId);
    const data = definidos({
      ...cambios,
      inicio: opcionalAFecha(cambios.inicio) ?? undefined,
      termino: opcionalAFecha(cambios.termino),
    });
    if (dryRun) return vistaVinculo({ ...actual, ...data });
    const r = await ctx.transaccion(async (tx) => {
      const v = await tx.vinculoLaboral.update({ where: { id }, data });
      await ctx.eventos.emitir(tx, {
        tipo: "core.vinculo.actualizado",
        entidadTipo: "vinculo",
        entidadId: id,
        payload: {
          personaId: v.personaId,
          antes: vistaVinculo(actual),
          despues: vistaVinculo(v),
          campos: Object.keys(data),
        },
      });
      return v;
    });
    return vistaVinculo(r);
  },
});
