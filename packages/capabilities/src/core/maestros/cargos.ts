import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";
import { defineCapability } from "../../define";
import { rechazoSensible } from "../../errores";
import { uuidSchema } from "../esquemas";
import { aFecha, definidos, escribirConEvento, hoy, sinDuplicado } from "./comun";
import { resumenSueldoDe, resumenSueldoSchema } from "./cargos-resumen";
import {
  campos,
  cargoDe,
  cargoSchema,
  conteos,
  DUPLICADO,
  nombreLibre,
  vista,
} from "./cargos-vista";
import { ocultarMontosDeCargo } from "./estructuras-acceso";

export const cargosList = defineCapability({
  id: "core.cargos.list",
  descripcion:
    "Cargos de la empresa (guardia, supervisor, operario…) con personas con vínculo vigente, puestos activos y los montos de su estructura de sueldo vigente hoy.",
  permiso: PERMISOS_CORE.estructurasRead,
  input: z.object({ incluirInactivos: z.boolean().default(false) }),
  output: z.array(cargoSchema.extend({ sueldoVigente: resumenSueldoSchema })),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    // Una sola consulta (ADR-045): conteos por `_count` filtrado y la estructura vigente por `include`,
    // en vez de dos conteos y un sueldo por cargo (N+1).
    const cargos = await ctx.db.cargo.findMany({
      where: input.incluirInactivos ? {} : { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      include: {
        _count: {
          select: {
            vinculos: { where: { estado: "vigente" } },
            puestos: { where: { estado: "activo" } },
          },
        },
        estructuras: {
          where: { nivel: "cargo", estado: "vigente", vigenteDesde: { lte: aFecha(hoy()) } },
          orderBy: { vigenteDesde: "desc" },
          take: 1,
        },
      },
    });
    return Promise.all(
      cargos.map(async (c) => ({
        ...vista(c, { personasVigentes: c._count.vinculos, puestosActivos: c._count.puestos }),
        sueldoVigente: resumenSueldoDe(
          c.estructuras[0],
          await ocultarMontosDeCargo(ctx, c, c.estructuras[0]),
        ),
      })),
    );
  },
});

export const cargosGet = defineCapability({
  id: "core.cargos.get",
  descripcion:
    "Ficha de un cargo: clase, si su sueldo es sensible, estado y conteos de personas y puestos.",
  permiso: PERMISOS_CORE.estructurasRead,
  input: z.object({ id: uuidSchema }),
  output: cargoSchema,
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input) => vista(await cargoDe(ctx, input.id), await conteos(ctx, input.id)),
});

export const cargosCreate = defineCapability({
  id: "core.cargos.create",
  descripcion:
    "Crea un cargo con nombre único. Su estructura de sueldo se define después con core.estructuras.create (nivel cargo).",
  permiso: PERMISOS_CORE.estructurasManage,
  input: z.object(campos),
  output: cargoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (input.sueldoSensible && !ctx.autorizar(PERMISOS_CORE.estructurasReadSensible))
      throw rechazoSensible("No tienes permiso para crear un cargo sensible.");
    await nombreLibre(ctx, input.nombre);
    const data = definidos(input);
    if (dryRun) return vista({ ...data, id: "" });
    const c = await escribirConEvento(
      ctx,
      { tipo: "core.cargo.creado", entidadTipo: "cargo" },
      (tx) =>
        sinDuplicado(
          tx.cargo.create({ data: { activo: true, ...data, tenantId: ctx.tenantId } }),
          DUPLICADO,
        ),
    );
    return vista(c);
  },
});

export const cargosUpdate = defineCapability({
  id: "core.cargos.update",
  descripcion:
    "Actualiza un cargo (nombre, descripción, clase, sensibilidad del sueldo, orden). Solo cambia lo enviado.",
  permiso: PERMISOS_CORE.estructurasManage,
  input: z.object({
    id: uuidSchema,
    activo: z.boolean().optional(),
    ...z.object(campos).partial().shape,
  }),
  output: cargoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    return ctx.transaccion(async (tx) => {
      // Las lecturas y escrituras usan la misma transacción y el bloqueo de la fila.
      ctx = { ...ctx, db: tx, transaccion: (fn) => fn(tx) };
      if (typeof (ctx.db as { $executeRaw?: unknown }).$executeRaw === "function")
        await ctx.db
          .$executeRaw`SELECT id FROM core.cargos WHERE id = ${id}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
      const actual = await cargoDe(ctx, id);
      if (
        cambios.sueldoSensible !== undefined &&
        cambios.sueldoSensible !== actual.sueldoSensible &&
        !ctx.autorizar(PERMISOS_CORE.estructurasReadSensible)
      )
        throw rechazoSensible(
          "No tienes permiso para cambiar la privacidad de los montos de este cargo.",
        );
      await nombreLibre(ctx, cambios.nombre, id);
      const data = definidos(cambios);
      const n = await conteos(ctx, id);
      if (dryRun) return vista({ ...actual, ...data }, n);
      const c = await escribirConEvento(
        ctx,
        { tipo: "core.cargo.actualizado", entidadTipo: "cargo", payload: () => data },
        (tx) => sinDuplicado(tx.cargo.update({ where: { id }, data }), DUPLICADO),
      );
      return vista(c, n);
    });
  },
});

export { cargosSetActivo } from "./cargos-activo";
