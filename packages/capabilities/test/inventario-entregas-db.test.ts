// CAR-238 · Entregas de Inventario contra Postgres real (rol sin BYPASSRLS): activo a una persona y
// devolución, ropa a una instalación que descuenta y devuelve existencias, una sola entrega abierta por
// activo, destino de otra empresa rechazado y alcance del supervisor.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { limpiarModulos } from "../src/module";
import { codigo, dato } from "./maestros-ayuda";

type Entrega = { id: string; item: string; destino: string; devueltaEn: string | null; cantidad: number | null };

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
  const sufijo = randomUUID().slice(0, 8);

  const ctx = (tenantId: string, alcance: string[] | null = null) =>
    mod.crearContexto({
      tenantId,
      rol: alcance ? "supervisor" : "owner",
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
    const cuenta = await e.admin.cuenta.create({ data: { tenantId, nombre: `Cuenta ${nombre}` } });
    return (await e.admin.instalacion.create({ data: { tenantId, cuentaId: cuenta.id, nombre } })).id;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    limpiarModulos();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesInventario]);
    ana = (await e.admin.user.create({ data: { name: "Ana", email: `ana-${sufijo}@prueba.cl`, emailVerified: true } })).id;
    a = await empresa(`ent-a-${sufijo}`);
    b = await empresa(`ent-b-${sufijo}`);
    persona = (await e.admin.persona.create({ data: { tenantId: a, nombres: "Pedro", apellidos: "Soto", rut: "30000002-8" } })).id;
    personaB = (await e.admin.persona.create({ data: { tenantId: b, nombres: "Bea", apellidos: "Paz", rut: "30000003-6" } })).id;
    instalacion = await sitio(a, "Planta Norte");
    otraInstalacion = await sitio(a, "Bodega Sur");
    const tel = await dato<{ id: string }>(ctx(a), "inventario.tipos.crear", { categoria: "activo", nombre: "Teléfono" });
    activo = (await dato<{ id: string }>(ctx(a), "inventario.activos.crear", { tipoId: tel.id, codigo: "TEL-1" })).id;
    camisa = (await dato<{ id: string }>(ctx(a), "inventario.tipos.crear", { categoria: "ropa", nombre: "Camisa", tallas: ["M"] })).id;
    await dato(ctx(a), "inventario.ropa.ingresar", { tipoId: camisa, lineas: [{ talla: "M", cantidad: 5 }] });
  });
  afterAll(async () => {
    limpiarModulos();
    await e?.cerrar();
  });

  it("entrega un activo a una persona: queda asignado y no se entrega dos veces (R20)", async () => {
    const r = await dato<Entrega>(ctx(a), "inventario.entregas.entregar_activo", { activoId: activo, personaId: persona });
    expect(r).toMatchObject({ item: "TEL-1", destino: "Pedro Soto", devueltaEn: null });
    expect((await e.admin.inventarioActivo.findFirst({ where: { id: activo } }))?.estado).toBe("asignado");
    expect(await codigo(ctx(a), "inventario.entregas.entregar_activo", { activoId: activo, instalacionId: instalacion })).toBe("UNPROCESSABLE");
    expect(await codigo(ctx(a), "inventario.activos.cambiar_estado", { id: activo, estado: "de_baja", motivo: "Perdido" })).toBe("UNPROCESSABLE");
  });

  it("R19: exige un solo destino y de la misma empresa", async () => {
    const r = await codigo(ctx(a), "inventario.entregas.entregar_ropa", { tipoId: camisa, talla: "M", cantidad: 1 });
    expect(r).toBe("UNPROCESSABLE");
    const ambos = { tipoId: camisa, talla: "M", cantidad: 1, personaId: persona, instalacionId: instalacion };
    expect(await codigo(ctx(a), "inventario.entregas.entregar_ropa", ambos)).toBe("UNPROCESSABLE");
    expect(await codigo(ctx(a), "inventario.entregas.entregar_ropa", { tipoId: camisa, talla: "M", cantidad: 1, personaId: personaB })).toBe("NOT_FOUND");
  });

  it("entrega ropa a una instalación: descuenta, no deja bajo cero y la devolución la repone", async () => {
    const r = await dato<Entrega>(ctx(a), "inventario.entregas.entregar_ropa", { tipoId: camisa, talla: "m", cantidad: 3, instalacionId: instalacion });
    expect(r).toMatchObject({ item: "Camisa talla M", destino: "Planta Norte", cantidad: 3 });
    expect(await existencia("M")).toBe(2);
    expect(await codigo(ctx(a), "inventario.entregas.entregar_ropa", { tipoId: camisa, talla: "M", cantidad: 3, personaId: persona })).toBe("UNPROCESSABLE");
    await dato(ctx(a), "inventario.entregas.devolver", { id: r.id, nota: "Cierre del servicio" });
    expect(await existencia("M")).toBe(5);
    expect(await codigo(ctx(a), "inventario.entregas.devolver", { id: r.id })).toBe("CONFLICT");
  });

  it("R22: el activo devuelto dañado queda en reparación", async () => {
    const [abierta] = (await dato<{ items: Entrega[] }>(ctx(a), "inventario.entregas.list", { activoId: activo })).items;
    if (!abierta) throw new Error("falta la entrega abierta");
    await dato(ctx(a), "inventario.entregas.devolver", { id: abierta.id, estadoActivo: "en_reparacion" });
    expect((await e.admin.inventarioActivo.findFirst({ where: { id: activo } }))?.estado).toBe("en_reparacion");
    const devueltas = await dato<{ items: Entrega[] }>(ctx(a), "inventario.entregas.list", { estado: "devueltas" });
    expect(devueltas.items).toHaveLength(2);
  });

  it("R23: el supervisor solo ve entregas de sus instalaciones; otra empresa no ve nada", async () => {
    await dato(ctx(a), "inventario.entregas.entregar_ropa", { tipoId: camisa, talla: "M", cantidad: 1, instalacionId: otraInstalacion });
    const supervisor = await dato<{ items: Entrega[] }>(ctx(a, [instalacion]), "inventario.entregas.list", { estado: "todas" });
    expect(supervisor.items.every((x) => x.destino === "Planta Norte")).toBe(true);
    expect((await dato<{ items: Entrega[] }>(ctx(b), "inventario.entregas.list", { estado: "todas" })).items).toEqual([]);
  });
});
