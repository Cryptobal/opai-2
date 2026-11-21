// CAR-238 · Entregas de Inventario contra Postgres real (rol sin BYPASSRLS): activo a una persona y
// devolución, ropa a una instalación que descuenta y devuelve existencias, una sola entrega abierta por
// activo, destino de otra empresa rechazado y alcance del supervisor.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest as manifestInventario } from "../../../modules/inventario/manifest";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { limpiarModulos } from "../src/module";
import { codigo, dato, sembrarContratoVigente } from "./maestros-ayuda";

type Entrega = { id: string; item: string; destino: string; instalacionId: string | null; devueltaEn: string | null; cantidad: number | null };

describe.skipIf(!urlPropietario)("inventario · entregas en base real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  let ana = "";
  let persona = "";
  let personaB = "";
  let instalacion = "";
  let otraInstalacion = "";
  let activo = "";
  let camisa = "";
  let entregaActivoId = "";
  const sufijo = randomUUID().slice(0, 8);

  const ctx = (tenantId: string, alcance: string[] | null = null, rol: "owner" | "supervisor" = alcance ? "supervisor" : "owner") =>
    mod.crearContexto({
      tenantId,
      rol,
      actor: { tipo: "user", id: ana },
      usuario: { id: ana, nombre: "Ana", email: `ana-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["inventario"],
      ...(alcance ? { alcance: { instalaciones: alcance } } : {}),
    });
  const existencia = async (talla: string) =>
    (await e.admin.inventarioExistencia.findFirst({ where: { tenantId: a, tipoId: camisa, talla } }))?.cantidad;

  async function empresa(slug: string) {
    const t = await e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad", timezone: "America/Santiago" } });
    await e.admin.membership.create({ data: { tenantId: t.id, userId: ana, rol: "owner", portales: ["erp"] } });
    return t.id;
  }
  async function sitio(tenantId: string, nombre: string) {
    const db = e.forTenant(tenantId);
    const cuenta = await db.cuenta.create({ data: { tenantId, nombre: `Cuenta ${nombre}` } });
    return (await db.instalacion.create({ data: { tenantId, cuentaId: cuenta.id, nombre } })).id;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    limpiarModulos();
    mod.registrarModulos([manifestInventario]);
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesInventario]);
    ana = (await e.admin.user.create({ data: { name: "Ana", email: `ana-${sufijo}@prueba.cl`, emailVerified: true } })).id;
    a = await empresa(`ent-a-${sufijo}`);
    b = await empresa(`ent-b-${sufijo}`);
    persona = (await e.admin.persona.create({ data: { tenantId: a, nombres: "Pedro", apellidos: "Soto", rut: "30000002-8" } })).id;
    personaB = (await e.admin.persona.create({ data: { tenantId: b, nombres: "Bea", apellidos: "Paz", rut: "30000003-6" } })).id;
    instalacion = await sitio(a, "Planta Norte");
    otraInstalacion = await sitio(a, "Bodega Sur");
    await sembrarContratoVigente(e, a, persona, instalacion);
    const tel = await dato<{ id: string }>(ctx(a), "inventario.tipos.crear", { categoria: "activo", nombre: "Teléfono" });
    activo = (await dato<{ id: string }>(ctx(a), "inventario.activos.crear", { tipoId: tel.id, codigo: `TEL-${sufijo}` })).id;
    camisa = (await dato<{ id: string }>(ctx(a), "inventario.tipos.crear", { categoria: "ropa", nombre: "Camisa", tallas: ["M"] })).id;
    await dato(ctx(a), "inventario.ropa.ingresar", { tipoId: camisa, lineas: [{ talla: "M", cantidad: 5 }] });
  });
  afterAll(async () => {
    limpiarModulos();
    await e?.cerrar();
  });

  it("entrega un activo a una persona: queda asignado y no se entrega dos veces (R20)", async () => {
    await dato(ctx(a), "inventario.entregas.entregar_activo", { activoId: activo, personaId: persona }, { dryRun: true });
    expect(
      await e.admin.inventarioEntrega.count({
        where: { tenantId: a, activoId: activo, devueltaEn: null },
      }),
    ).toBe(0);
    const r = await dato<Entrega>(ctx(a), "inventario.entregas.entregar_activo", { activoId: activo, personaId: persona });
    entregaActivoId = r.id;
    expect(r).toMatchObject({ item: `TEL-${sufijo}`, destino: "Pedro Soto · Planta Norte", devueltaEn: null });
    expect((await e.admin.inventarioActivo.findFirst({ where: { id: activo } }))?.estado).toBe("asignado");
    expect(await codigo(ctx(a), "inventario.entregas.entregar_activo", { activoId: activo, instalacionId: instalacion })).toBe("UNPROCESSABLE");
    expect(await codigo(ctx(a), "inventario.activos.cambiar_estado", { id: activo, estado: "de_baja", motivo: "Perdido" })).toBe("UNPROCESSABLE");
  });

  it("R19: exige destino y de la misma empresa (CAR-487: persona + imputación)", async () => {
    const r = await codigo(ctx(a), "inventario.entregas.entregar_ropa", { tipoId: camisa, talla: "M", cantidad: 1 });
    expect(r).toBe("UNPROCESSABLE");
    const ambos = { tipoId: camisa, talla: "M", cantidad: 1, personaId: persona, instalacionId: instalacion };
    const stock = (await existencia("M")) ?? 0;
    await dato(ctx(a), "inventario.entregas.entregar_ropa", ambos, { dryRun: true });
    expect(await existencia("M")).toBe(stock);
    expect(await codigo(ctx(a), "inventario.entregas.entregar_ropa", { tipoId: camisa, talla: "M", cantidad: 1, personaId: personaB })).toBe("NOT_FOUND");
    const instalacionB = await sitio(b, "Otra empresa");
    expect(await codigo(ctx(a), "inventario.entregas.entregar_ropa", { tipoId: camisa, talla: "M", cantidad: 1, instalacionId: instalacionB })).toBe("NOT_FOUND");
  });

  it("entrega ropa a una instalación: descuenta, no deja bajo cero y la devolución la repone", async () => {
    const stock = (await existencia("M")) ?? 0;
    const r = await dato<Entrega>(ctx(a), "inventario.entregas.entregar_ropa", { tipoId: camisa, talla: "m", cantidad: 3, instalacionId: instalacion });
    expect(r).toMatchObject({ item: "Camisa talla M", destino: "Planta Norte", cantidad: 3 });
    expect(await existencia("M")).toBe(stock - 3);
    expect(await codigo(ctx(a), "inventario.entregas.entregar_ropa", { tipoId: camisa, talla: "M", cantidad: 3, personaId: persona })).toBe("UNPROCESSABLE");
    expect(await existencia("M")).toBe(stock - 3);
    await dato(ctx(a), "inventario.entregas.devolver", { id: r.id, nota: "Cierre del servicio" });
    expect(await existencia("M")).toBe(stock);
    expect(await codigo(ctx(a), "inventario.entregas.devolver", { id: r.id })).toBe("CONFLICT");
  });

  it("R22: el activo devuelto dañado queda en reparación", async () => {
    expect(entregaActivoId).not.toBe("");
    await dato(ctx(a), "inventario.entregas.devolver", { id: entregaActivoId, estadoActivo: "en_reparacion" });
    expect((await e.admin.inventarioActivo.findFirst({ where: { id: activo } }))?.estado).toBe("en_reparacion");
    const devueltas = await dato<{ items: Entrega[] }>(ctx(a), "inventario.entregas.list", {
      estado: "devueltas",
      activoId: activo,
    });
    const hallada = devueltas.items.find((x) => x.id === entregaActivoId);
    expect(hallada?.devueltaEn).toEqual(expect.any(String));
  });

  it("R23: el supervisor solo ve entregas de sus instalaciones; otra empresa no ve nada", async () => {
    const dentro = await dato<Entrega>(ctx(a), "inventario.entregas.entregar_ropa", { tipoId: camisa, talla: "M", cantidad: 1, instalacionId: instalacion });
    const fuera = await dato<Entrega>(ctx(a), "inventario.entregas.entregar_ropa", { tipoId: camisa, talla: "M", cantidad: 1, instalacionId: otraInstalacion });
    const supervisor = await dato<{ items: Entrega[] }>(ctx(a, [instalacion]), "inventario.entregas.list", {
      estado: "abiertas",
      instalacionId: instalacion,
    });
    const visibles = supervisor.items.map((x) => x.id);
    expect(visibles).toContain(dentro.id);
    expect(visibles).not.toContain(fuera.id);
    const fueraList = await dato<{ items: Entrega[] }>(ctx(a, [instalacion]), "inventario.entregas.list", {
      estado: "abiertas",
      instalacionId: otraInstalacion,
    });
    expect(fueraList.items.map((x) => x.id)).not.toContain(fuera.id);
    const acotado = ctx(a, [instalacion], "owner");
    expect(await codigo(acotado, "inventario.entregas.devolver", { id: fuera.id })).toBe("NOT_FOUND");
    expect(await codigo(acotado, "inventario.entregas.entregar_ropa", { tipoId: camisa, talla: "M", cantidad: 1, instalacionId: otraInstalacion })).toBe("NOT_FOUND");
    const enB = await dato<{ items: Entrega[] }>(ctx(b), "inventario.entregas.list", { estado: "todas", limite: 50 });
    expect(enB.items).toEqual([]);
  });
});