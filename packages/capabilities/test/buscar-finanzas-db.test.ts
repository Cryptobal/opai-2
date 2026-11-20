// CAR-402: la búsqueda global encuentra facturas y notas por folio o cliente, y proveedores por nombre, con el
// permiso de Finanzas y sin cruzar empresas. Solo datos ficticios (empresas qa-busf*).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { folioDeBusqueda } from "../../../modules/finanzas/buscador";
import { manifest } from "../../../modules/finanzas/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as Mod from "../src";

type Grupo = { grupo: string; items: { id: string; titulo: string; detalle: string | null; href: string }[] };

describe("folioDeBusqueda", () => {
  it("reconoce 102 y folio 102; lo demás no es folio", () => {
    expect(folioDeBusqueda("102")).toBe(102);
    expect(folioDeBusqueda("Folio 102")).toBe(102);
    expect(folioDeBusqueda("factura 102")).toBeNull();
  });
});

describe.skipIf(omitirSuiteDb())("core.buscar · aporte de Finanzas (CAR-402)", () => {
  let e: Entorno, mod: typeof Mod;
  const t = { a: "", b: "" };
  const uid = randomUUID();
  const d: Record<string, string> = {};
  const ctx = (tid: string, permisosRol: string[]) =>
    mod.crearContexto({
      permisosRol, tenantId: tid, actor: { tipo: "user", id: uid },
      usuario: { id: uid, nombre: "Prueba", email: `${uid.slice(0, 6)}@busf.test`, platformRole: null },
      portal: "erp", portalesMembresia: ["erp"], rol: "gerente", modulosActivos: ["finanzas"], medidor: { registrar: async () => undefined },
    });
  const buscar = async (c: ReturnType<typeof ctx>, q: string, grupo: string) => {
    const res = await mod.executeCapability(c, "core.buscar", { q }, {});
    if (!res.ok) throw new Error(JSON.stringify(res.error));
    return (res.data as { otros: Grupo[] }).otros.find((g) => g.grupo === grupo)?.items ?? null;
  };
  const LECTOR = ["finanzas:read"];

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    const mk = (s: string) => e.admin.tenant.create({ data: { slug: `${s}-${randomUUID().slice(0, 8)}`, nombre: s, vertical: "seguridad" } });
    t.a = (await mk("qa-busfa")).id;
    t.b = (await mk("qa-busfb")).id;
    const cuenta = async (tenantId: string, nombre: string) => (await e.admin.cuenta.create({ data: { tenantId, nombre, estado: "cliente_activo" } })).id;
    const ca = await cuenta(t.a, "Cliente Zafiro Ficticio");
    const cb = await cuenta(t.b, "Cliente Zafiro Beta");
    const doc = async (k: string, tenantId: string, cuentaId: string, tipoDte: number, folio: number | null) => {
      d[k] = (await e.admin.documentoEmitido.create({ data: { tenantId, cuentaId, tipoDte, folio, estadoDte: folio ? "aceptado" : "borrador" } })).id;
    };
    await doc("factura", t.a, ca, 33, 9402);
    await doc("nc", t.a, ca, 61, 9403);
    await doc("borrador", t.a, ca, 33, null);
    await doc("beta", t.b, cb, 33, 9402);
    d["prov"] = (await e.admin.proveedor.create({ data: { tenantId: t.a, rut: "76999402-1", razonSocial: "Proveedora Ficticia Zafiro", giro: "Aseo" } })).id;
    d["provB"] = (await e.admin.proveedor.create({ data: { tenantId: t.b, rut: "76999402-1", razonSocial: "Proveedora Ficticia Zafiro" } })).id;
  });
  afterAll(async () => { await e?.cerrar(); });

  it("encuentra la factura por folio, solo de su empresa", async () => {
    expect(await buscar(ctx(t.a, LECTOR), "9402", "facturas")).toEqual([
      { id: d["factura"], titulo: "Factura electrónica 9402", detalle: "Cliente Zafiro Ficticio · $0", href: `/finanzas/ventas/${d["factura"]}` },
    ]);
    expect((await buscar(ctx(t.b, LECTOR), "9402", "facturas"))?.map((x) => x.id)).toEqual([d["beta"]]);
  });

  it("por nombre del cliente trae facturas, notas y borradores de esa empresa", async () => {
    const items = (await buscar(ctx(t.a, LECTOR), "zafiro", "facturas")) ?? [];
    expect(items.map((x) => x.id).sort()).toEqual([d["factura"], d["nc"], d["borrador"]].sort());
    expect(items.map((x) => x.titulo)).toContain("Nota de crédito electrónica 9403");
    expect(items.map((x) => x.titulo)).toContain("Factura electrónica · borrador");
  });

  it("encuentra proveedores por nombre sin mostrar el de otra empresa", async () => {
    expect(await buscar(ctx(t.a, LECTOR), "proveedora", "proveedores")).toEqual([
      { id: d["prov"], titulo: "Proveedora Ficticia Zafiro", detalle: "Aseo", href: `/finanzas/compras/proveedores/${d["prov"]}` },
    ]);
  });

  it("sin permiso de Finanzas no aparece ninguno de los dos grupos", async () => {
    const sin = ctx(t.a, ["core:tenant.read"]);
    expect(await buscar(sin, "zafiro", "facturas")).toBeNull();
    expect(await buscar(sin, "proveedora", "proveedores")).toBeNull();
  });
});
