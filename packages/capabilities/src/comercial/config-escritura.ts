import { z } from "zod";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { definidos, sinDuplicado } from "../core/maestros/comun";
import { REQUISITOS, TONOS_ETAPA } from "./dominio";
import { PERMISO_CONFIG, etapaDe, etapaSchema } from "./comun";
import { vistaEtapa } from "./embudo-util";

/** Edita una etapa del embudo: nombre, orden, probabilidad, tono, requisitos y si está activa. El
 * tipo (abierta/ganada/perdida) no cambia (R26). */
export const configActualizarEtapa = defineCapability({
  id: "comercial.config.actualizar_etapa",
  descripcion:
    "Edita una etapa del embudo: nombre, probabilidad, tono, requisitos de entrada y si está activa. El tipo no cambia (R26); una etapa ganada o perdida no se desactiva. El orden se cambia con comercial.config.reordenar_etapas.",
  permiso: PERMISO_CONFIG,
  input: z.object({
    id: uuidSchema,
    nombre: z.string().trim().min(2).max(60).optional(),
    probabilidad: z.number().int().min(0).max(100).optional(),
    tono: z.enum(TONOS_ETAPA).optional(),
    exige: z.array(z.enum(REQUISITOS)).optional(),
    activa: z.boolean().optional(),
  }),
  output: etapaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const etapa = await etapaDe(ctx, id);
    if (cambios.activa === false && etapa.tipo !== "abierta") {
      throw reglaDeNegocio("La etapa ganada y la perdida no se desactivan.");
    }
    // Una etapa con negocios no se desactiva: primero se mueven (export ConfigComercial, reglas).
    if (cambios.activa === false && etapa.activa) {
      const n = await ctx.db.negocio.count({ where: { etapaId: id, archivadoEn: null } });
      if (n > 0) {
        throw reglaDeNegocio(
          `Mueve ${n === 1 ? "su negocio" : `sus ${n} negocios`} a otra etapa antes de desactivarla.`,
        );
      }
    }
    const data = definidos({ ...cambios, exige: cambios.exige ? [...cambios.exige] : undefined });
    const fila = dryRun
      ? { ...etapa, ...data }
      : await ctx.db.etapa.update({ where: { id }, data });
    return vistaEtapa(fila);
  },
});

const CATALOGOS = ["tipo", "origen", "motivo"] as const;

/** Código estable de un motivo: sin acentos, minúsculas y guiones bajos («Pérdida» → «perdida»). */
const codigoDe = (nombre: string) =>
  nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "motivo";

/** Crea o edita un ítem de un catálogo del tenant (tipo de negocio, origen o motivo de pérdida). */
export const configGuardarCatalogo = defineCapability({
  id: "comercial.config.guardar_catalogo",
  descripcion:
    "Crea o edita un ítem de un catálogo del tenant: tipo de negocio, origen o motivo de pérdida, con su nombre, orden y si está activo.",
  permiso: PERMISO_CONFIG,
  input: z.object({
    catalogo: z.enum(CATALOGOS),
    id: uuidSchema.optional(),
    nombre: z.string().trim().min(2).max(80),
    orden: z.number().int().min(0).max(99).default(0),
    activo: z.boolean().default(true),
  }),
  output: z.object({
    id: z.string(),
    catalogo: z.enum(CATALOGOS),
    nombre: z.string(),
    activo: z.boolean(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const data = { nombre: input.nombre, orden: input.orden, activo: input.activo };
    if (dryRun)
      return {
        id: input.id ?? "",
        catalogo: input.catalogo,
        nombre: input.nombre,
        activo: input.activo,
      };
    const guardar = async <T extends { id: string; nombre: string; activo: boolean }>(
      buscar: (id: string) => Promise<T | null>,
      crear: () => Promise<T>,
      actualizar: (id: string) => Promise<T>,
    ) => {
      if (input.id) {
        if (!(await buscar(input.id))) throw noEncontrado("El ítem del catálogo");
        return sinDuplicado(actualizar(input.id), "Ya existe un ítem con ese nombre.");
      }
      return sinDuplicado(crear(), "Ya existe un ítem con ese nombre.");
    };
    let fila: { id: string; nombre: string; activo: boolean };
    if (input.catalogo === "tipo") {
      fila = await guardar(
        (id) => ctx.db.tipoNegocio.findUnique({ where: { id } }),
        () => ctx.db.tipoNegocio.create({ data: { ...data, tenantId: ctx.tenantId } }),
        (id) => ctx.db.tipoNegocio.update({ where: { id }, data }),
      );
    } else if (input.catalogo === "origen") {
      fila = await guardar(
        (id) => ctx.db.origenNegocio.findUnique({ where: { id } }),
        () => ctx.db.origenNegocio.create({ data: { ...data, tenantId: ctx.tenantId } }),
        (id) => ctx.db.origenNegocio.update({ where: { id }, data }),
      );
    } else {
      fila = await guardar(
        (id) => ctx.db.motivoPerdida.findUnique({ where: { id } }),
        () =>
          ctx.db.motivoPerdida.create({
            data: { ...data, tenantId: ctx.tenantId, codigo: codigoDe(input.nombre) },
          }),
        (id) => ctx.db.motivoPerdida.update({ where: { id }, data }),
      );
    }
    return { id: fila.id, catalogo: input.catalogo, nombre: fila.nombre, activo: fila.activo };
  },
});
