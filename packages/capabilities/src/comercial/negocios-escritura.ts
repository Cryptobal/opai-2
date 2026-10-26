import { z } from "zod";

import { defineCapability } from "../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { definidos, diaSchema, opcionalAFecha } from "../core/maestros/comun";
import type { Contexto } from "../types";
import { estadoDeTipo } from "./dominio";
import { PERMISO_MANAGE, embudoPorDefecto, negocioDe, negocioSchema, vistaNegocio } from "./comun";

const camposNegocio = {
  titulo: z.string().trim().min(3).max(120).describe("Título del negocio (por defecto «cuenta · servicio»)."),
  tipoId: uuidSchema.nullable().optional().describe("Tipo de negocio (catálogo del tenant)."),
  origenId: uuidSchema.nullable().optional().describe("Origen del negocio (catálogo del tenant)."),
  responsableId: uuidSchema.nullable().optional().describe("Responsable; por defecto, quien lo crea."),
  probabilidad: z.number().int().min(0).max(100).optional(),
  montoEstimadoMensual: z.number().int().positive().nullable().optional().describe("CLP entero > 0."),
  cierreEstimado: diaSchema.nullable().optional(),
  inicioServicioEstimado: diaSchema.nullable().optional(),
};

async function cuentaValida(ctx: Contexto, cuentaId: string) {
  const c = await ctx.db.cuenta.findUnique({ where: { id: cuentaId }, select: { id: true } });
  if (!c) throw noEncontrado("La cuenta");
}

export const negociosCreate = defineCapability({
  id: "comercial.negocios.create",
  descripcion:
    "Crea un negocio en la primera etapa del embudo por defecto, vinculado a una cuenta, con responsable, tipo, origen y monto estimado opcionales.",
  permiso: PERMISO_MANAGE,
  input: z.object({ cuentaId: uuidSchema, ...camposNegocio }),
  output: negocioSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await cuentaValida(ctx, input.cuentaId);
    const embudo = await embudoPorDefecto(ctx);
    const primera = await ctx.db.etapa.findFirst({
      where: { embudoId: embudo.id, activa: true },
      orderBy: { orden: "asc" },
    });
    if (!primera) throw reglaDeNegocio("El embudo no tiene etapas.");
    const responsableId = input.responsableId ?? ctx.usuario?.id ?? null;
    const data = definidos({
      titulo: input.titulo,
      cuentaId: input.cuentaId,
      embudoId: embudo.id,
      etapaId: primera.id,
      estado: estadoDeTipo(primera.tipo),
      tipoId: input.tipoId,
      origenId: input.origenId,
      responsableId,
      probabilidad: input.probabilidad ?? primera.probabilidad,
      montoEstimadoMensual: input.montoEstimadoMensual,
      cierreEstimado: opcionalAFecha(input.cierreEstimado),
      inicioServicioEstimado: opcionalAFecha(input.inicioServicioEstimado),
    });
    if (dryRun) {
      return vistaNegocio({
        id: "",
        valorMensual: null,
        cotizacionEnviadaEn: null,
        motivoPerdidaId: null,
        motivoPerdidaDetalle: null,
        competidor: null,
        ganadoEn: null,
        perdidoEn: null,
        archivadoEn: null,
        createdAt: new Date(),
        ...data,
        tipoId: data.tipoId ?? null,
        origenId: data.origenId ?? null,
        responsableId: data.responsableId ?? null,
        montoEstimadoMensual: data.montoEstimadoMensual ?? null,
        cierreEstimado: data.cierreEstimado ?? null,
        inicioServicioEstimado: data.inicioServicioEstimado ?? null,
      });
    }
    const creado = await ctx.transaccion(async (tx) => {
      const n = await tx.negocio.create({ data: { ...data, tenantId: ctx.tenantId } });
      await tx.historialEtapa.create({
        data: {
          tenantId: ctx.tenantId,
          negocioId: n.id,
          aEtapaId: primera.id,
          actorTipo: ctx.actor.tipo,
          actorId: ctx.actor.id ?? null,
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "comercial.negocio.creado",
        entidadTipo: "negocio",
        entidadId: n.id,
        payload: { cuentaId: n.cuentaId, etapaId: n.etapaId },
      });
      return n;
    });
    return vistaNegocio(creado);
  },
});

export const negociosUpdate = defineCapability({
  id: "comercial.negocios.update",
  descripcion:
    "Actualiza los datos editables de un negocio (título, tipo, origen, responsable, probabilidad, monto estimado y fechas). Solo cambia lo enviado.",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema, ...z.object(camposNegocio).partial().shape }),
  output: negocioSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const actual = await negocioDe(ctx, id);
    if (cambios.montoEstimadoMensual !== undefined && actual.valorMensual != null) {
      throw conflicto("El monto lo fija la cotización vigente; no se edita a mano.");
    }
    const data = definidos({
      titulo: cambios.titulo,
      tipoId: cambios.tipoId,
      origenId: cambios.origenId,
      responsableId: cambios.responsableId,
      probabilidad: cambios.probabilidad,
      montoEstimadoMensual: cambios.montoEstimadoMensual,
      cierreEstimado: opcionalAFecha(cambios.cierreEstimado),
      inicioServicioEstimado: opcionalAFecha(cambios.inicioServicioEstimado),
    });
    if (dryRun) return vistaNegocio({ ...actual, ...data });
    const n = await ctx.transaccion(async (tx) => {
      const r = await tx.negocio.update({ where: { id }, data });
      await ctx.eventos.emitir(tx, {
        tipo: "comercial.negocio.actualizado",
        entidadTipo: "negocio",
        entidadId: r.id,
        payload: { campos: Object.keys(data) },
      });
      return r;
    });
    return vistaNegocio(n);
  },
});
