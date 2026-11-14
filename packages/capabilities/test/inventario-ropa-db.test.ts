// CAR-237 · Existencias de ropa contra Postgres real (rol sin BYPASSRLS): ingreso por talla, ajuste tras
// conteo, nunca bajo cero, historial que solo se agrega, permisos y aislamiento entre empresas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { limpiarModulos } from "../src/module";
import { codigo, dato } from "./maestros-ayuda";

type Prenda = { tipoId: string; existencias: { talla: string; cantidad: number }[]; total: number };

describe.skipIf(!urlPropietario)("inventario · ropa en base real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  let ana = "";
  let camisa = "";
  let radio = "";
  const sufijo = randomUUID().slice(0, 8);

  const ctx = (tenantId: string, rol: "owner" | "viewer" = "owner") =>
    mod.crearContexto({
      tenantId,
      rol,
      actor: { tipo: "user", id: ana },
      usuario: { id: ana, nombre: "Ana", email: `ana-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["inventario"],
    });
  const existencias = async (tenantId: string) =>
    (await dato<{ items: Prenda[] }>(ctx(tenantId), "inventario.ropa.list", {})).items.find((p) => p.tipoId === camisa);

  async function empresa(slug: string) {
    const t = await e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad", timezone: "America/Santiago" } });
    await e.admin.membership.create({ data: { tenantId: t.id, userId: ana, rol: "owner", portales: ["erp"] } });
    return t.id;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    limpiarModulos();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesInventario]);
    ana = (await e.admin.user.create({ data: { name: "Ana", email: `ana-${sufijo}@prueba.cl`, emailVerified: true } })).id;
    a = await empresa(`ropa-a-${sufijo}`);
    b = await empresa(`ropa-b-${sufijo}`);
    const crear = (input: unknown) => dato<{ id: string }>(ctx(a), "inventario.tipos.crear", input);
    camisa = (await crear({ categoria: "ropa", nombre: "Camisa", tallas: ["S", "M", "L"] })).id;
    radio = (await crear({ categoria: "activo", nombre: "Radio" })).id;
  });
  afterAll(async () => {
    limpiarModulos();
    await e?.cerrar();
  });

  it("muestra todas las tallas en cero antes del primer ingreso", async () => {
    expect(await existencias(a)).toMatchObject({ total: 0, existencias: [{ talla: "S", cantidad: 0 }, { talla: "M", cantidad: 0 }, { talla: "L", cantidad: 0 }] });
  });

  it("R15 y R16: la vista previa no guarda; el ingreso suma por talla y deja el movimiento", async () => {
    const input = { tipoId: camisa, lineas: [{ talla: "m", cantidad: 4 }, { talla: "M", cantidad: 1 }, { talla: "L", cantidad: 2 }], nota: "Factura 123" };
    await dato(ctx(a), "inventario.ropa.ingresar", input, { dryRun: true });
    expect((await existencias(a))?.total).toBe(0);
    await dato(ctx(a), "inventario.ropa.ingresar", input);
    expect(await existencias(a)).toMatchObject({ total: 7, existencias: [{ talla: "S", cantidad: 0 }, { talla: "M", cantidad: 5 }, { talla: "L", cantidad: 2 }] });
    const movs = await dato<{ items: { talla: string; delta: number; motivo: string; nota: string }[] }>(ctx(a), "inventario.ropa.movimientos", { tipoId: camisa });
    expect(movs.items.map((m) => [m.talla, m.delta, m.motivo])).toEqual(expect.arrayContaining([["M", 5, "ingreso"], ["L", 2, "ingreso"]]));
  });

  it("rechaza tallas ajenas, cantidades inválidas y tipos de activo", async () => {
    const ingresar = (input: unknown) => codigo(ctx(a), "inventario.ropa.ingresar", input);
    expect(await ingresar({ tipoId: camisa, lineas: [{ talla: "XXL", cantidad: 1 }] })).toBe("UNPROCESSABLE");
    expect(await ingresar({ tipoId: camisa, lineas: [{ talla: "M", cantidad: 0 }] })).toBe("INVALID_INPUT");
    expect(await ingresar({ tipoId: radio, lineas: [{ talla: "M", cantidad: 1 }] })).toBe("UNPROCESSABLE");
  });

  it("R17: el ajuste fija la cantidad contada, pide motivo y nunca deja bajo cero", async () => {
    await dato(ctx(a), "inventario.ropa.ajustar", { tipoId: camisa, talla: "M", cantidad: 3, motivo: "Conteo de noviembre" });
    expect((await existencias(a))?.existencias.find((x) => x.talla === "M")?.cantidad).toBe(3);
    expect(await codigo(ctx(a), "inventario.ropa.ajustar", { tipoId: camisa, talla: "M", cantidad: 3, motivo: "Igual" })).toBe("UNPROCESSABLE");
    expect(await codigo(ctx(a), "inventario.ropa.ajustar", { tipoId: camisa, talla: "M", cantidad: -1, motivo: "Mal" })).toBe("INVALID_INPUT");
    const movs = await dato<{ items: { delta: number; motivo: string }[] }>(ctx(a), "inventario.ropa.movimientos", { tipoId: camisa, limite: 1 });
    expect(movs.items[0]).toMatchObject({ delta: -2, motivo: "ajuste" });
  });

  it("R18: los movimientos no se pueden cambiar ni borrar con el rol de la app", async () => {
    await expect(
      e.appSinTenant.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.tenant_id', '${a}', true)`);
        await tx.$executeRawUnsafe(`UPDATE inventario.movimientos SET delta = 99`);
      }),
    ).rejects.toThrow(/permission denied/);
  });

  it("el lector ve y no ingresa; otra empresa no ve nada", async () => {
    expect(await codigo(ctx(a, "viewer"), "inventario.ropa.ingresar", { tipoId: camisa, lineas: [{ talla: "S", cantidad: 1 }] })).toBe("FORBIDDEN");
    expect(await codigo(ctx(a, "viewer"), "inventario.ropa.list", {})).toBe("OK");
    expect((await dato<{ items: Prenda[] }>(ctx(b), "inventario.ropa.list", {})).items).toEqual([]);
    expect(await codigo(ctx(b), "inventario.ropa.movimientos", { tipoId: camisa })).toBe("NOT_FOUND");
    expect(await codigo(ctx(b), "inventario.ropa.ingresar", { tipoId: camisa, lineas: [{ talla: "S", cantidad: 1 }] })).toBe("NOT_FOUND");
  });
});
