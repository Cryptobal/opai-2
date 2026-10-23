import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { escribirConEvento } from "./comun";
import { instalacionDe, nombresDeCuentas } from "./instalaciones";
import { ESTADOS_INSTALACION, instalacionSchema, vistaInstalacion } from "./instalaciones-vista";

type Estado = (typeof ESTADOS_INSTALACION)[number];
const TRANSICIONES: Record<Estado, readonly Estado[]> = {
  prospecto: ["activa", "inactiva"],
  activa: ["inactiva"],
  inactiva: ["activa"],
};

export const instalacionesSetEstado = defineCapability({
  id: "core.instalaciones.set_estado",
  descripcion:
    "Cambia el estado de una instalación: prospecto → activa ⇄ inactiva. Una instalación inactiva no recibe operación.",
  permiso: PERMISOS_CORE.instalacionesManage,
  input: z.object({ id: uuidSchema, estado: z.enum(ESTADOS_INSTALACION) }),
  output: instalacionSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const i = await instalacionDe(ctx, input.id);
    const desde = i.estado as Estado;
    if (!TRANSICIONES[desde]?.includes(input.estado)) {
      throw reglaDeNegocio(`Una instalación "${desde}" no puede pasar a "${input.estado}".`);
    }
    const cuenta = (await nombresDeCuentas(ctx, [i.cuentaId])).get(i.cuentaId) ?? null;
    if (dryRun) return vistaInstalacion({ ...i, estado: input.estado }, cuenta);
    const r = await escribirConEvento(
      ctx,
      {
        tipo: "core.instalacion.estado_cambiado",
        entidadTipo: "instalacion",
        payload: () => ({ desde, hacia: input.estado }),
      },
      (tx) => tx.instalacion.update({ where: { id: i.id }, data: { estado: input.estado } }),
    );
    return vistaInstalacion(r, cuenta);
  },
});

export const instalacionesArchive = defineCapability({
  id: "core.instalaciones.archive",
  descripcion:
    "Archiva una instalación (se conserva su historial). Exige que no tenga puestos activos.",
  permiso: PERMISOS_CORE.instalacionesManage,
  input: z.object({ id: uuidSchema }),
  output: instalacionSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const i = await instalacionDe(ctx, input.id);
    const activos = await ctx.db.puesto.count({ where: { instalacionId: i.id, estado: "activo" } });
    if (activos) throw reglaDeNegocio(`La instalación tiene ${activos} puesto(s) activo(s).`);
    const data = { archivadaEn: i.archivadaEn ?? new Date(), estado: "inactiva" };
    const cuenta = (await nombresDeCuentas(ctx, [i.cuentaId])).get(i.cuentaId) ?? null;
    if (dryRun) return vistaInstalacion({ ...i, ...data }, cuenta);
    const r = await escribirConEvento(
      ctx,
      { tipo: "core.instalacion.archivada", entidadTipo: "instalacion" },
      (tx) => tx.instalacion.update({ where: { id: i.id }, data }),
    );
    return vistaInstalacion(r, cuenta);
  },
});
