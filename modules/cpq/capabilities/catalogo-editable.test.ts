import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { mockMotorLegal } from "../persistencia/mock-motor-legal";
import { ACTIVOS, CON_COSTOS, GESTOR, NEGOCIO_1, semilla } from "./fixtures";
import { capacidades } from "./index";

beforeAll(() => registrarCapacidades(capacidades));

const entorno = () =>
  contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, permisos: [...GESTOR, ...CON_COSTOS, "cpq:modelo.manage"] });
type Ctx = ReturnType<typeof entorno>["ctx"];
const CAT = "0192f3a0-0000-7000-8000-0000000000b1";
/** La base en memoria no aplica los defaults de Prisma: la categoría se siembra completa. */
const sembrarCategoria = (ctx: Ctx) =>
  ctx.db.cpqCatalogoCategoria.create({
    data: { id: CAT, tenantId: ctx.tenantId, clave: "extra", nombre: "Extras", clase: "directo", activa: true, orden: 0 },
  });
const ejecutar = async <T>(ctx: Ctx, id: string, input: unknown, dryRun = false) => {
  const r = await executeCapability(ctx, id, input, { dryRun });
  if (!r.ok) throw new Error(`${id}: ${r.error.message}`);
  return r.data as T;
};

describe("catálogo de CPQ editable", () => {
  it("crea categoría e ítem, archiva y restaura con la misma capacidad", async () => {
    const { ctx } = entorno();
    const cat = await sembrarCategoria(ctx);
    const item = await ejecutar<{ id: string }>(ctx, "cpq.catalogo_items.create", {
      codigo: "RADIO-9", nombre: "Radio portátil", categoriaId: cat.id, costoUnitarioClp: 12_000,
    });
    await ejecutar(ctx, "cpq.catalogo_items.archivar", { id: item.id });
    const activos = await ejecutar<{ items: { id: string }[] }>(ctx, "cpq.catalogo_items.list", {});
    expect(activos.items.some((i) => i.id === item.id)).toBe(false);
    const rest = await ejecutar<{ activo: boolean }>(ctx, "cpq.catalogo_items.update", { id: item.id, activo: true });
    expect(rest.activo).toBe(true);
    await ejecutar(ctx, "cpq.catalogo_categorias.desactivar", { id: cat.id });
    const c2 = await ejecutar<{ activa: boolean }>(ctx, "cpq.catalogo_categorias.update", { id: cat.id, activa: true });
    expect(c2.activa).toBe(true);
  });

  it("el dryRun de editar un ítem no escribe", async () => {
    const { ctx } = entorno();
    const cat = await sembrarCategoria(ctx);
    const item = await ejecutar<{ id: string }>(ctx, "cpq.catalogo_items.create", { codigo: "A1", nombre: "A", categoriaId: cat.id });
    const previa = await ejecutar<{ nombre: string }>(ctx, "cpq.catalogo_items.update", { id: item.id, nombre: "B" }, true);
    expect(previa.nombre).toBe("B");
    expect((await ctx.db.cpqCatalogoItem.findFirst({ where: { id: item.id } }))?.nombre).toBe("A");
  });
});

describe("margen: vista previa", () => {
  it("el dryRun de cpq.versiones.margen no escribe", async () => {
    const { ctx } = entorno();
    mockMotorLegal();
    const c = await ejecutar<{ id: string; versionId: string }>(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Margen" });
    const antes = (await ctx.db.cpqVersion.findFirst({ where: { id: c.versionId } }))?.margenObjetivoPct;
    await ejecutar(ctx, "cpq.versiones.margen", { versionId: c.versionId, margenObjetivoPct: 250_000 }, true);
    expect((await ctx.db.cpqVersion.findFirst({ where: { id: c.versionId } }))?.margenObjetivoPct).toBe(antes);
  });
});
