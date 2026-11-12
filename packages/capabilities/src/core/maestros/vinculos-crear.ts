import type { z } from "zod";
import type { TenantTx } from "@opai/db";
import type { Contexto } from "../../types";
import { reglaDeNegocio } from "../../errores";
import type { camposVinculo } from "./vinculos-vista";
import { aFecha, sinDuplicado } from "./comun";
import {
  exigirEdicionVinculo,
  reclutadorPorDefecto,
  validarDestino,
  validarReclutador,
} from "./vinculos-validacion";

type DatosVinculo = z.output<z.ZodObject<typeof camposVinculo>>;

/** Crea el vínculo y su evento dentro de la transacción del llamador. */
export async function crearVinculo(
  ctx: Contexto,
  tx: TenantTx,
  personaId: string,
  v: DatosVinculo,
) {
  exigirEdicionVinculo(ctx);
  await validarDestino({ ...ctx, db: tx }, v);
  if (v.termino && v.termino < v.inicio) throw reglaDeNegocio("El término es anterior al inicio.");
  // «Reclutado por» (CAR-309): el que venga o, si no, quien registra el ingreso.
  // Quien registra ya es usuario de la empresa; solo se valida un reclutador enviado a mano.
  if (v.reclutadoPorId) await validarReclutador({ ...ctx, db: tx }, v.reclutadoPorId);
  const reclutadoPorId = v.reclutadoPorId === undefined ? reclutadorPorDefecto(ctx) : v.reclutadoPorId;
  const creado = await sinDuplicado(
    tx.vinculoLaboral.create({
      data: {
        tenantId: ctx.tenantId,
        personaId,
        cargoId: v.cargoId,
        instalacionId: v.instalacionId,
        puestoId: v.puestoId ?? null,
        horasSemanales: v.horasSemanales,
        distribucion: v.distribucion,
        tipo: v.tipo,
        inicio: aFecha(v.inicio),
        termino: v.termino ? aFecha(v.termino) : null,
        estado: "vigente",
        reclutadoPorId,
      },
    }),
    "La persona ya tiene un vínculo vigente: primero termínalo.",
  );
  await ctx.eventos.emitir(tx, {
    tipo: "core.vinculo.creado",
    entidadTipo: "vinculo",
    entidadId: creado.id,
    payload: { personaId, cargoId: v.cargoId, tipo: v.tipo, inicio: v.inicio },
  });
  return creado;
}
