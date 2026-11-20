import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { aFecha, opcionalAFecha } from "./comun";
import { cargoParaVinculo, crearVinculo } from "./personas-escritura";
import { personaDe } from "./personas-vista";
import { camposVinculo, vinculoSchema, vistaVinculo } from "./vinculos-vista";
import { bloquearNoAnonimizado, exigirNoAnonimizado } from "./anonimizado";
import {
  exigirPersonaOperableVinculo,
  exigirTransicionPersonaPermitida,
  transicionarPersonaEnTx,
} from "./personas-estado-implicito";
import {
  exigirEdicionVinculo,
  reclutadorPorDefecto,
  validarDestino,
  validarReclutador,
} from "./vinculos-validacion";

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
    exigirPersonaOperableVinculo(p, "La persona");
    if (p.estado !== "activo") exigirTransicionPersonaPermitida(p.estado ?? "activo", "activo");
    const vigente = await ctx.db.vinculoLaboral.findFirst({ where: { personaId, estado: "vigente" } });
    if (vigente) {
      throw reglaDeNegocio("La persona ya tiene un vínculo vigente: primero termínalo (core.vinculos.terminar).");
    }
    await cargoParaVinculo(ctx, v.cargoId);
    if (dryRun) {
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
      const fresca = await tx.persona.findFirst({
        where: { id: personaId },
        select: { estado: true, archivadaEn: true, bloqueada: true, anonimizadaEn: true },
      });
      if (!fresca) throw noEncontrado("La persona");
      exigirPersonaOperableVinculo(fresca, "La persona");
      const r = await crearVinculo(ctx, tx, personaId, v);
      const est = fresca.estado ?? "activo";
      if (est !== "activo") await transicionarPersonaEnTx(tx, personaId, "activo", est);
      return r;
    });
    return vistaVinculo(creado);
  },
});