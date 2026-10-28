import type { Contexto } from "../../types";
import { exigirEdicionVinculo, validarDestino } from "./vinculos-validacion";
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";
export { crearVinculo } from "./vinculos-crear";
import { crearVinculo } from "./vinculos-crear";

import { defineCapability } from "../../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { definidos, escribirConEvento, opcionalAFecha, otroQue, sinDuplicado } from "./comun";
import {
  camposPersona,
  personaDe,
  personaSchema,
  vinculosVigentes,
  vistaPersona,
} from "./personas-vista";
import { camposVinculo } from "./vinculos-vista";
import { bloquearNoAnonimizado, exigirNoAnonimizado } from "./anonimizado";

const DUPLICADO = "Ya existe una persona con ese RUT.";

async function rutLibre(ctx: Contexto, rut?: string, excepto?: string) {
  if (!rut) return;
  const otra = await ctx.db.persona.findFirst({ where: { rut, ...otroQue(excepto) } });
  if (otra) throw conflicto(`${DUPLICADO} (${otra.nombres} ${otra.apellidos}).`);
}

export async function cargoParaVinculo(ctx: Contexto, cargoId: string) {
  const c = await ctx.db.cargo.findUnique({ where: { id: cargoId } });
  if (!c) throw noEncontrado("El cargo");
  if (!c.activo) throw reglaDeNegocio(`El cargo "${c.nombre}" está desactivado.`);
  return c;
}

export const personasCreate = defineCapability({
  id: "core.personas.create",
  descripcion:
    "Registra una persona (trabajador) con RUT obligatorio y único. Opcionalmente crea su vínculo laboral inicial (cargo, tipo de contrato e inicio).",
  permiso: PERMISOS_CORE.personasManage,
  input: z.object({ ...camposPersona, vinculo: z.object(camposVinculo).optional() }),
  output: personaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { vinculo, ...input }, { dryRun }) {
    if (vinculo) {
      exigirEdicionVinculo(ctx);
      if (!ctx.autorizar(PERMISOS_CORE.vinculosManage))
        throw reglaDeNegocio("Sin permiso de vínculos.");
      await validarDestino(ctx, vinculo);
    }
    await rutLibre(ctx, input.rut);
    const cargo = vinculo ? await cargoParaVinculo(ctx, vinculo.cargoId) : null;
    const data = definidos({ ...input, fechaNacimiento: opcionalAFecha(input.fechaNacimiento) });
    const resumen = (id: string) =>
      vinculo && cargo
        ? {
            id,
            instalacionId: vinculo.instalacionId,
            puestoId: vinculo.puestoId ?? null,
            horasSemanales: vinculo.horasSemanales,
            distribucion: vinculo.distribucion,
            cargoId: cargo.id,
            cargo: cargo.nombre,
            tipo: vinculo.tipo,
            inicio: vinculo.inicio,
            termino: vinculo.termino ?? null,
          }
        : null;
    if (dryRun) return vistaPersona({ ...data, id: "", estado: "activa" }, resumen(""));
    let vinculoId = "";
    const p = await escribirConEvento(
      ctx,
      { tipo: "core.persona.creada", entidadTipo: "persona" },
      async (tx) => {
        const nueva = await sinDuplicado(
          tx.persona.create({ data: { ...data, estado: "activa", tenantId: ctx.tenantId } }),
          DUPLICADO,
        );
        if (vinculo) vinculoId = (await crearVinculo(ctx, tx, nueva.id, vinculo)).id;
        return nueva;
      },
    );
    return vistaPersona(p, resumen(vinculoId));
  },
});

export const personasUpdate = defineCapability({
  id: "core.personas.update",
  descripcion:
    "Actualiza los datos de una persona (nombres, RUT, contacto, nacimiento, dirección). Solo cambia lo enviado.",
  permiso: PERMISOS_CORE.personasManage,
  input: z.object({ id: uuidSchema, ...z.object(camposPersona).partial().shape }),
  output: personaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const actual = await personaDe(ctx, id);
    exigirNoAnonimizado(actual, "La persona");
    await rutLibre(ctx, cambios.rut, id);
    const data = definidos({
      ...cambios,
      fechaNacimiento: opcionalAFecha(cambios.fechaNacimiento),
    });
    const vinculo = (await vinculosVigentes(ctx, [id])).get(id) ?? null;
    if (dryRun) return vistaPersona({ ...actual, ...data }, vinculo);
    const p = await escribirConEvento(
      ctx,
      {
        tipo: "core.persona.actualizada",
        entidadTipo: "persona",
        payload: () => ({ campos: Object.keys(data) }),
      },
      async (tx) => {
        await bloquearNoAnonimizado(tx, "persona", id);
        return sinDuplicado(tx.persona.update({ where: { id }, data }), DUPLICADO);
      },
    );
    return vistaPersona(p, vinculo);
  },
});
