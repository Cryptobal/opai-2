// CAR-743 · Configuración de inventario (prendas y categorías) contra Postgres real.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest as manifestInventario } from "../../../modules/inventario/manifest";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { limpiarModulos } from "../src/module";
import { codigo, dato } from "./maestros-ayuda";

describe.skipIf(!urlPropietario)("inventario · configuración en base real", () => {
  let e: Entorno;
  let tenant = "";
  let ana = "";
  const sufijo = randomUUID().slice(0, 8);

  const ctx = () =>
    mod.crearContexto({
      tenantId: tenant,
      rol: "owner",
      actor: { tipo: "user", id: ana },
      usuario: { id: ana, nombre: "Ana", email: `ana-inv-cfg-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["inventario"],
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    limpiarModulos();
    mod.registrarModulos([manifestInventario]);
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesInventario]);
    ana = (
      await e.admin.user.create({
        data: { name: "Ana", email: `ana-inv-cfg-${sufijo}@prueba.cl`, emailVerified: true },
      })
    ).id;
    const t = await e.admin.tenant.create({
      data: { slug: `inv-cfg-${sufijo}`, nombre: "CFG", vertical: "seguridad", timezone: "America/Santiago" },
    });
    tenant = t.id;
    await e.admin.membership.create({ data: { tenantId: tenant, userId: ana, rol: "owner", portales: ["erp"] } });
  });

  afterAll(async () => {
    limpiarModulos();
    await e?.cerrar();
  });

  it("conserva la clave al renombrar una prenda del uniforme", async () => {
    const c = ctx();
    await dato(c, "inventario.config.prendas_guardar", {
      prendas: [{ nombre: "Camisa operativa", activo: true, orden: 0 }],
    });
    const lista1 = await dato<{ items: { clave: string; nombre: string }[] }>(
      c,
      "inventario.config.prendas_list",
      {},
    );
    const clave = lista1.items[0]!.clave;
    await dato(c, "inventario.config.prendas_guardar", {
      prendas: [{ clave, nombre: "Polera operativa", activo: true, orden: 0 }],
    });
    const kit = await dato<{ items: { clave: string; nombre: string }[] }>(c, "inventario.prendas.list", {
      limite: 50,
    });
    expect(kit.items.some((p) => p.clave === clave && p.nombre === "Polera operativa")).toBe(true);
  });

  it("agrega una categoría personalizada con comportamiento de ropa", async () => {
    const c = ctx();
    await dato(c, "inventario.config.categorias_guardar", {
      categorias: [
        { clave: "activo", nombre: "Activo", comportamiento: "activo", activo: true, orden: 0 },
        { clave: "ropa", nombre: "Ropa", comportamiento: "ropa", activo: true, orden: 1 },
        { nombre: "Uniforme", comportamiento: "ropa", activo: true, orden: 2 },
      ],
    });
    const tipo = await dato<{ id: string; categoria: string }>(c, "inventario.tipos.crear", {
      categoria: "uniforme",
      nombre: `Gorro CFG ${sufijo}`,
      tallas: ["U"],
    });
    expect(tipo.categoria).toBe("uniforme");
    expect(await codigo(c, "inventario.tipos.crear", { categoria: "no_existe", nombre: "X", tallas: ["U"] })).toBe(
      "INVALID_INPUT",
    );
  });
});