import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { definidos, escribirConEvento, sinDuplicado } from "./comun";
import {
  cambiaEstructura,
  camposPatron,
  conteoPuestosPatron,
  DUPLICADO_PATRON,
  EN_USO,
  estructuraPatron,
  nombrePatronLibre,
  patronDe,
  patronSchema,
  puestosConPatron,
  vistaPatron,
} from "./patrones-vista";

export const patronesList = defineCapability({
  id: "core.patrones.list",
  descripcion:
    "Catálogo de patrones de turno del tenant (4×4, 7×7, 5×2…): la forma del ciclo, con su resumen legible y cuántos puestos activos lo usan. El horario y las horas van en el puesto.",
  permiso: PERMISOS_CORE.instalacionesRead,
  input: z.object({ incluirInactivos: z.boolean().default(false) }),
  output: z.array(patronSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.patronTurno.findMany({
      where: input.incluirInactivos ? {} : { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    });
    const grupos = await ctx.db.puesto.groupBy({
      by: ["patronId"],
      where: { estado: "activo", patronId: { in: filas.map((f) => f.id) } },
      _count: { _all: true },
    });
    const conteo = new Map(grupos.map((g) => [g.patronId, g._count._all]));
    return filas.map((p) => vistaPatron(p, conteo.get(p.id) ?? 0));
  },
});

export const patronesGet = defineCapability({
  id: "core.patrones.get",
  descripcion: "Ficha de un patrón de turno: clase, ciclo o días de la semana, y puestos que lo usan.",
  permiso: PERMISOS_CORE.instalacionesRead,
  input: z.object({ id: uuidSchema }),
  output: patronSchema,
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input) =>
    vistaPatron(await patronDe(ctx, input.id), await conteoPuestosPatron(ctx, input.id)),
});

export const patronesCreate = defineCapability({
  id: "core.patrones.create",
  descripcion:
    "Crea un patrón de turno del tenant con nombre único: cíclico (días de trabajo × descanso) o semanal (días fijos de la semana).",
  permiso: PERMISOS_CORE.instalacionesManage,
  input: z.object(camposPatron),
  output: patronSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await nombrePatronLibre(ctx, input.nombre);
    const data = definidos({ ...input, ...estructuraPatron(input) });
    if (dryRun) return vistaPatron({ ...data, id: "" });
    const p = await escribirConEvento(
      ctx,
      { tipo: "core.patron.creado", entidadTipo: "patron_turno" },
      (tx) =>
        sinDuplicado(
          tx.patronTurno.create({
            data: { deFabrica: false, activo: true, ...data, tenantId: ctx.tenantId },
          }),
          DUPLICADO_PATRON,
        ),
    );
    return vistaPatron(p);
  },
});

export const patronesUpdate = defineCapability({
  id: "core.patrones.update",
  descripcion:
    "Actualiza un patrón de turno (nombre, clase, ciclo, días de la semana, orden). Solo cambia lo enviado; los de fábrica también se pueden ajustar. Si el patrón ya tiene puestos, su clase, ciclo y días no cambian.",
  permiso: PERMISOS_CORE.instalacionesManage,
  input: z.object({ id: uuidSchema, ...z.object(camposPatron).partial().shape }),
  output: patronSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const actual = await patronDe(ctx, id);
    await nombrePatronLibre(ctx, cambios.nombre, id);
    const clase = cambios.clase ?? actual.clase;
    const mismaClase = clase === actual.clase;
    const estructura = estructuraPatron({
      clase,
      diasTrabajo: cambios.diasTrabajo ?? (clase === "semanal" ? undefined : actual.diasTrabajo),
      diasDescanso: cambios.diasDescanso ?? (clase === "semanal" ? undefined : actual.diasDescanso),
      diasSemana: cambios.diasSemana ?? (mismaClase ? actual.diasSemana : []),
    });
    const toca = cambiaEstructura(actual, estructura);
    const data = definidos({ ...cambios, ...estructura });
    // Un patrón con puestos no cambia su forma: los puestos guardan el ciclo y las horas calculadas
    // con ella. Se revisa también dentro de la transacción (y la base lo impide con un trigger).
    if (toca && (await puestosConPatron(ctx.db, id)) > 0) throw reglaDeNegocio(EN_USO);
    const n = await conteoPuestosPatron(ctx, id);
    if (dryRun) return vistaPatron({ ...actual, ...data }, n);
    const p = await escribirConEvento(
      ctx,
      { tipo: "core.patron.actualizado", entidadTipo: "patron_turno", payload: () => data },
      async (tx) => {
        if (toca && (await puestosConPatron(tx, id)) > 0) throw reglaDeNegocio(EN_USO);
        return sinDuplicado(tx.patronTurno.update({ where: { id }, data }), DUPLICADO_PATRON);
      },
    );
    return vistaPatron(p, n);
  },
});

export const patronesSetActivo = defineCapability({
  id: "core.patrones.set_activo",
  descripcion:
    "Activa o desactiva un patrón de turno. Desactivar no borra (los de fábrica nunca se eliminan): impide elegirlo en puestos nuevos.",
  permiso: PERMISOS_CORE.instalacionesManage,
  input: z.object({ id: uuidSchema, activo: z.boolean() }),
  output: patronSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, activo }, { dryRun }) {
    const actual = await patronDe(ctx, id);
    const n = await conteoPuestosPatron(ctx, id);
    if (dryRun) return vistaPatron({ ...actual, activo }, n);
    const p = await escribirConEvento(
      ctx,
      { tipo: "core.patron.actualizado", entidadTipo: "patron_turno", payload: () => ({ activo }) },
      (tx) => tx.patronTurno.update({ where: { id }, data: { activo } }),
    );
    return vistaPatron(p, n);
  },
});
