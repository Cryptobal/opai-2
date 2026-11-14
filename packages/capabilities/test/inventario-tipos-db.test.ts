// CAR-235 · Catálogo de tipos de Inventario contra Postgres real (rol sin BYPASSRLS): crear, vista
// previa sin guardar, reglas de categoría, nombre único sin tildes, sugeridos idempotentes, permisos
// y aislamiento entre empresas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { limpiarModulos } from "../src/module";
import { codigo, dato } from "./maestros-ayuda";

type Tipo = { id: string; nombre: string; categoria: string; campos: { clave: string; etiqueta: string }[]; tallas: string[]; activo: boolean };
type Pagina = { items: Tipo[]; siguiente: string | null };

describe.skipIf(!urlPropietario)("inventario · catálogo de tipos en base real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  let ana = "";
  const sufijo = randomUUID().slice(0, 8);

  const ctx = (tenantId: string, rol = "owner") =>
    mod.crearContexto({
      tenantId,
      rol,
      actor: { tipo: "user", id: ana },
      usuario: { id: ana, nombre: "Ana", email: `ana-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["inventario"],
    });

  async function empresa(slug: string, vertical: string) {
    const t = await e.admin.tenant.create({
      data: { slug, nombre: slug, vertical, timezone: "America/Santiago" },
    });
    await e.admin.membership.create({ data: { tenantId: t.id, userId: ana, rol: "owner", portales: ["erp"] } });
    return t.id;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    limpiarModulos();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesInventario]);
    ana = (
      await e.admin.user.create({ data: { name: "Ana", email: `ana-${sufijo}@prueba.cl`, emailVerified: true } })
    ).id;
    a = await empresa(`inv-a-${sufijo}`, "seguridad");
    b = await empresa(`inv-b-${sufijo}`, "aseo");
  });
  afterAll(async () => {
    limpiarModulos();
    await e?.cerrar();
  });

  const telefono = {
    categoria: "activo",
    nombre: "Teléfono",
    campos: [{ etiqueta: "IMEI", obligatorio: true }, { etiqueta: "Número de serie" }],
  };

  it("la vista previa no guarda; después crea con claves de campo estables", async () => {
    const previa = await dato<Tipo>(ctx(a), "inventario.tipos.crear", telefono, { dryRun: true });
    expect(previa.campos.map((c) => c.clave)).toEqual(["imei", "numero_de_serie"]);
    expect(await e.admin.inventarioTipo.count({ where: { tenantId: a } })).toBe(0);
    const t = await dato<Tipo>(ctx(a), "inventario.tipos.crear", telefono);
    expect(t).toMatchObject({ nombre: "Teléfono", categoria: "activo", activo: true, tallas: [] });
  });

  it("R1: el nombre es único sin distinguir mayúsculas ni tildes", async () => {
    expect(await codigo(ctx(a), "inventario.tipos.crear", { ...telefono, nombre: " TELEFONO " })).toBe("CONFLICT");
  });

  it("R3: la ropa exige tallas sin repetir y el activo no lleva tallas", async () => {
    const crear = (input: unknown) => codigo(ctx(a), "inventario.tipos.crear", input);
    expect(await crear({ categoria: "ropa", nombre: "Camisa" })).toBe("UNPROCESSABLE");
    expect(await crear({ categoria: "ropa", nombre: "Camisa", tallas: ["M", "m"] })).toBe("UNPROCESSABLE");
    expect(await crear({ categoria: "activo", nombre: "Radio", tallas: ["M"] })).toBe("UNPROCESSABLE");
    expect(await crear({ categoria: "activo", nombre: "Radio", prendaClave: "camisa" })).toBe("UNPROCESSABLE");
    expect(await crear({ categoria: "ropa", nombre: "Camisa", tallas: ["S", "M"], prendaClave: "camisa" })).toBe("OK");
  });

  it("actualiza conservando la clave del campo y desactiva sin borrar (R4, R5)", async () => {
    const [t] = (await dato<Pagina>(ctx(a), "inventario.tipos.list", { categoria: "activo" })).items;
    if (!t) throw new Error("falta el tipo");
    const nuevo = await dato<Tipo>(ctx(a), "inventario.tipos.actualizar", {
      id: t.id,
      campos: [{ clave: "imei", etiqueta: "IMEI principal", obligatorio: true }, { etiqueta: "Modelo" }],
      activo: false,
    });
    expect(nuevo.campos.map((c) => [c.clave, c.etiqueta])).toEqual([
      ["imei", "IMEI principal"],
      ["modelo", "Modelo"],
    ]);
    expect(nuevo.activo).toBe(false);
    const ajeno = { id: t.id, campos: [{ clave: "inventado", etiqueta: "Otro" }] };
    expect(await codigo(ctx(a), "inventario.tipos.actualizar", ajeno)).toBe("UNPROCESSABLE");
    const activos = await dato<Pagina>(ctx(a), "inventario.tipos.list", {});
    expect(activos.items.some((x) => x.id === t.id)).toBe(false);
    const todos = await dato<Pagina>(ctx(a), "inventario.tipos.list", { incluirInactivos: true });
    expect(todos.items.some((x) => x.id === t.id)).toBe(true);
  });

  it("R6: carga los sugeridos del rubro una sola vez, sin tocar los existentes", async () => {
    const primera = await dato<{ agregados: string[]; yaExistian: string[] }>(
      ctx(a),
      "inventario.tipos.cargar_sugeridos",
      {},
    );
    expect(primera.yaExistian).toEqual(expect.arrayContaining(["Teléfono", "Camisa"]));
    expect(primera.agregados).toEqual(expect.arrayContaining(["Radio", "Pantalón"]));
    const segunda = await dato<{ agregados: string[] }>(ctx(a), "inventario.tipos.cargar_sugeridos", {});
    expect(segunda.agregados).toEqual([]);
    const tel = await e.admin.inventarioTipo.findFirst({ where: { tenantId: a, nombreNormalizado: "telefono" } });
    expect(tel?.activo).toBe(false);
  });

  it("pagina con cursor", async () => {
    const p1 = await dato<Pagina>(ctx(a), "inventario.tipos.list", { limite: 3 });
    expect(p1.items).toHaveLength(3);
    expect(p1.siguiente).not.toBeNull();
    const p2 = await dato<Pagina>(ctx(a), "inventario.tipos.list", { limite: 3, cursor: p1.siguiente });
    expect(p2.items[0]?.id).not.toBe(p1.items[0]?.id);
  });

  it("solo quien tiene el permiso configura tipos; el lector ve", async () => {
    expect(await codigo(ctx(a, "viewer"), "inventario.tipos.crear", { ...telefono, nombre: "Linterna 2" })).toBe(
      "FORBIDDEN",
    );
    expect(await codigo(ctx(a, "viewer"), "inventario.tipos.list", {})).toBe("OK");
  });

  it("ninguna empresa ve ni cambia los tipos de otra", async () => {
    const deA = (await dato<Pagina>(ctx(a), "inventario.tipos.list", {})).items[0];
    if (!deA) throw new Error("falta un tipo de A");
    expect((await dato<Pagina>(ctx(b), "inventario.tipos.list", {})).items).toEqual([]);
    expect(await codigo(ctx(b), "inventario.tipos.get", { id: deA.id })).toBe("NOT_FOUND");
    expect(await codigo(ctx(b), "inventario.tipos.actualizar", { id: deA.id, activo: false })).toBe("NOT_FOUND");
    expect(await codigo(ctx(b), "inventario.tipos.crear", telefono)).toBe("OK");
  });
});
