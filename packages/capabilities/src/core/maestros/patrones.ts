import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { dondePuesto } from "./alcance";
import { definidos, escribirConEvento, sinDuplicado } from "./comun";
import {
  camposPatron,
  conteoPuestosPatron,
  DUPLICADO_PATRON,
  nombrePatronLibre,
  patronDe,
  patronSchema,
  vistaPatron,
} from "./patrones-vista";
import {
  bloquearPatron,
  cambiaEstructura,
  EN_USO,
  estructuraDelCambio,
  estructuraPatron,
  puestosConPatron,
} from "./patrones-estructura";

export const patronesList = defineCapability({
  id: "core.patrones.list",
  descripcion:
    "Catálogo de patrones de turno del tenant (4×4, 7×7, 5×2…): la forma del ciclo, con su resumen legible y cuántos puestos activos lo usan. El horario y las horas van en el puesto.",
  permiso: PERMISOS_CORE.patronesRead,
  input: z.object({ incluirInactivos: z.boolean().default(false) }),
  output: z.array(patronSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.patronTurno.findMany({
      where: input.incluirInactivos ? {} : { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    });
    // El conteo respeta el alcance por filas del supervisor (ADR-022, Brief 07c B3): sin alcance
    // sobre una instalación, sus puestos no cuentan (fail-closed, nunca el total del tenant).
    const grupos = await ctx.db.puesto.groupBy({
      by: ["patronId"],
      where: { estado: "activo", patronId: { in: filas.map((f) => f.id) }, AND: [dondePuesto(ctx)] },
      _count: { _all: true },
    });
    const conteo = new Map(grupos.map((g) => [g.patronId, g._count._all]));
    return filas.map((p) => vistaPatron(p, conteo.get(p.id) ?? 0));
  },
});

export const patronesGet = defineCapability({
  id: "core.patrones.get",
  descripcion:
    "Ficha de un patrón de turno: clase, ciclo o días de la semana, y puestos que lo usan.",
  permiso: PERMISOS_CORE.patronesRead,
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
  permiso: PERMISOS_CORE.patronesManage,
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
  permiso: PERMISOS_CORE.patronesManage,
  input: z.object({ id: uuidSchema, ...z.object(camposPatron).partial().shape }),
  output: patronSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const actual = await patronDe(ctx, id);
    await nombrePatronLibre(ctx, cambios.nombre, id);
    const { estructura, tocaForma } = estructuraDelCambio(actual, cambios);
    // Solo renombrar o reordenar no toca la forma (aunque un patrón antiguo no cumpla la regla nueva).
    const toca = tocaForma && cambiaEstructura(actual, estructura);
    const data = definidos({ ...cambios, ...(tocaForma ? estructura : {}) });
    // Un patrón con puestos no cambia su forma: los puestos guardan el ciclo y las horas calculadas
    // con ella. Se revisa también dentro de la transacción (y la base lo impide con un trigger).
    if (toca && (await puestosConPatron(ctx.db, id)) > 0) throw reglaDeNegocio(EN_USO);
    const n = await conteoPuestosPatron(ctx, id);
    if (dryRun) return vistaPatron({ ...actual, ...data }, n);
    const p = await escribirConEvento(
      ctx,
      { tipo: "core.patron.actualizado", entidadTipo: "patron_turno", payload: () => data },
      async (tx) => {
        // Mismo bloqueo que `patronBloqueadoParaHoras` (TOCTOU, review 5662449808 punto 1): un
        // puesto que está eligiendo este patrón en paralelo (crear o editar) lo lee con el mismo
        // advisory lock antes de copiarle el ciclo y las horas, así ninguno de los dos queda a
        // medio camino entre leer y escribir la forma.
        if (toca) await bloquearPatron(tx, id);
        if (toca && (await puestosConPatron(tx, id)) > 0) throw reglaDeNegocio(EN_USO);
        try {
          return await sinDuplicado(
            tx.patronTurno.update({ where: { id }, data }),
            DUPLICADO_PATRON,
          );
        } catch (e) {
          // Carrera con un puesto nuevo: la detiene el trigger patron_en_uso (check_violation).
          if (/en uso/.test(String((e as { message?: unknown } | null)?.message ?? "")))
            throw reglaDeNegocio(EN_USO);
          throw e;
        }
      },
    );
    return vistaPatron(p, n);
  },
});

export const patronesSetActivo = defineCapability({
  id: "core.patrones.set_activo",
  descripcion:
    "Activa o desactiva un patrón de turno. Desactivar no borra (los de fábrica nunca se eliminan): impide elegirlo en puestos nuevos.",
  permiso: PERMISOS_CORE.patronesDesactivar,
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
      // Mismo bloqueo que `patronBloqueadoParaHoras` (TOCTOU, review 5662449808 punto 1): así un
      // puesto que está eligiendo este patrón en paralelo no lo encuentra ya inactivo a medio camino.
      async (tx) => {
        await bloquearPatron(tx, id);
        return tx.patronTurno.update({ where: { id }, data: { activo } });
      },
    );
    return vistaPatron(p, n);
  },
});
