import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";
import { defineCapability } from "../../define";
import { noEncontrado, rechazoSensible } from "../../errores";
import { uuidSchema } from "../esquemas";
import { definidos, escribirConEvento, sinDuplicado } from "./comun";
import {
  campos,
  cargoDe,
  cargoSchema,
  conteos,
  DUPLICADO,
  nombreLibre,
  vista,
} from "./cargos-vista";

export const cargosList = defineCapability({
  id: "core.cargos.list",
  descripcion:
    "Catálogo de cargos de la empresa con personas con vínculo vigente y puestos activos, sin montos: el cargo ya no define sueldo.",
  permiso: PERMISOS_CORE.estructurasRead,
  input: z.object({ incluirInactivos: z.boolean().default(false) }),
  output: z.array(cargoSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    // Catálogo y conteos filtrados en una operación; no carga estructuras ni montos (ADR-045).
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
      },
    });
    return cargos.map((c) =>
      vista(c, { personasVigentes: c._count.vinculos, puestosActivos: c._count.puestos }),
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
  async handler(ctx, input) {
    const c = await ctx.db.cargo.findUnique({
      where: { id: input.id },
      include: {
        _count: {
          select: {
            vinculos: { where: { estado: "vigente" } },
            puestos: { where: { estado: "activo" } },
          },
        },
      },
    });
    if (!c) throw noEncontrado("El cargo");
    return vista(c, { personasVigentes: c._count.vinculos, puestosActivos: c._count.puestos });
  },
});

export const cargosCreate = defineCapability({
  id: "core.cargos.create",
  descripcion:
    "Crea un cargo de catálogo con nombre único, clase y sensibilidad. Los sueldos se definen en instalación, puesto o persona.",
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
