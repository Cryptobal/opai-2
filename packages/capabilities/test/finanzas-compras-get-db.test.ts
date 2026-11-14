// CAR-256: `finanzas.compras.get` devuelve un documento del libro de compras para el panel de detalle, y no
// revela documentos de otra empresa (RLS).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Datos = Record<string, unknown>;

describe.skipIf(!urlPropietario)("Finanzas · detalle de un documento de compras (CAR-256)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const tenants: string[] = [];
  const usuarioId = randomUUID();
  const ejecutar = (tenantId: string, id: string, input: Datos) =>
    mod.executeCapability(
      mod.crearContexto({
        tenantId,
        actor: { tipo: "user", id: usuarioId },
        usuario: { id: usuarioId, nombre: "Admin de prueba", email: "admin@prueba.cl", platformRole: null },
        portal: "erp",
        portalesMembresia: ["erp"],
        rol: "owner",
        modulosActivos: ["finanzas"],
        medidor: { registrar: async () => undefined },
      }),
      id,
      input,
    );
  const dato = async <T>(tenantId: string, id: string, input: Datos): Promise<T> => {
    const r = await ejecutar(tenantId, id, input);
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data as T;
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas]);
    for (const nombre of ["Atlas Seguridad SpA", "Boreal Aseo Ltda."]) {
      const slug = `fin-g-${randomUUID().slice(0, 8)}`;
      tenants.push((await e.admin.tenant.create({ data: { slug, nombre, vertical: "seguridad" } })).id);
    }
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("devuelve el documento con su proveedor y no lo revela a otra empresa", async () => {
    const [a, b] = tenants as [string, string];
    const proveedorId = (await dato<{ id: string }>(a, "finanzas.proveedores.crear", { rut: "76.543.210-3", razonSocial: "Uniformes del Sur SpA" })).id;
    const c = await dato<{ id: string }>(a, "finanzas.compras.registrar", {
      proveedorId,
      tipoDte: 33,
      folio: 501,
      fechaEmision: "2026-10-05",
      fechaRecepcion: "2026-10-06",
      montoNeto: 100_000,
      montoIva: 19_000,
    });
    const doc = await dato<Record<string, unknown>>(a, "finanzas.compras.get", { id: c.id });
    expect(doc).toMatchObject({ id: c.id, folio: 501, proveedorId, proveedorNombre: "Uniformes del Sur SpA", montoTotal: 119_000 });
    expect(await ejecutar(b, "finanzas.compras.get", { id: c.id })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await ejecutar(a, "finanzas.compras.get", { id: randomUUID() })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});
