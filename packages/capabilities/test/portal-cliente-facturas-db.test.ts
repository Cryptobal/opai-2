// CAR-518 · Facturas en el Portal Cliente contra Postgres real: apagadas por defecto, encendidas por cuenta; el contacto
// ve solo los documentos emitidos de su cuenta y de las instalaciones de su acceso, nunca borradores ni otra empresa.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { modulos } from "../../../modules/registry/src";

import type * as ModuloCapacidades from "../src";

type Lista = { items: { id: string; folio: number; tipo: string; estadoCobro: string; instalacion: string | null }[]; siguiente: string | null };

describe.skipIf(!urlPropietario)("Portal Cliente · facturas (Postgres real)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const sufijo = randomUUID().slice(0, 8);
  const t = { a: "", b: "" };
  const doc: Record<string, string> = {};
  let cx = "";
  const u = { x: randomUUID(), b: randomUUID() };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.registrarModulos(modulos);
    for (const k of ["a", "b"] as const)
      t[k] = (await e.admin.tenant.create({ data: { slug: `pcf-${k}-${sufijo}`, nombre: k, vertical: "seguridad" } })).id;
    await e.admin.dteConfig.create({ data: { tenantId: t.a, rutEmisor: "76111111-1" } });
    cx = (await e.admin.cuenta.create({ data: { tenantId: t.a, nombre: "Cuenta", rut: "76333333-3" } })).id;
    const cb = (await e.admin.cuenta.create({ data: { tenantId: t.b, nombre: "Otra" } })).id;
    const inst = async (tenantId: string, cuentaId: string, nombre: string) =>
      (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre, estado: "activa" } })).id;
    const [x1, x2, b1] = [await inst(t.a, cx, "Planta"), await inst(t.a, cx, "Bodega"), await inst(t.b, cb, "Ajena")];
    const emitido = async (k: string, tenantId: string, cuentaId: string, instalacionId: string | null, folio: number | null, estadoDte: string) => {
      doc[k] = (
        await e.admin.documentoEmitido.create({
          data: { tenantId, cuentaId, instalacionId, tipoDte: 33, folio, fechaEmision: new Date("2026-10-05"), montoNeto: 100_000, montoIva: 19_000, montoTotal: 119_000, estadoDte, timbrePdf417: folio ? "<TED>timbre de prueba</TED>" : null },
        })
      ).id;
    };
    await emitido("planta", t.a, cx, x1, 101, "aceptado");
    await emitido("planta2", t.a, cx, x1, 102, "enviado");
    await emitido("bodega", t.a, cx, x2, 103, "aceptado");
    await emitido("cuenta", t.a, cx, null, 104, "aceptado");
    await emitido("borrador", t.a, cx, x1, null, "borrador");
    await emitido("ajena", t.b, cb, b1, 201, "aceptado");
    const acceso = async (tenantId: string, userId: string, cuentaId: string, instalacionId: string) => {
      await e.admin.user.create({ data: { id: userId, name: "c", email: `${userId}@prueba.cl` } });
      const m = await e.admin.membership.create({ data: { tenantId, userId, rol: "viewer", portales: ["cliente"] } });
      const a = await e.admin.accesoCliente.create({ data: { tenantId, membershipId: m.id, cuentaId } });
      await e.admin.accesoInstalacion.create({ data: { tenantId, accesoId: a.id, instalacionId } });
    };
    await acceso(t.a, u.x, cx, x1);
    await acceso(t.b, u.b, cb, b1);
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = (tenantId: string, userId: string) =>
    mod.crearContexto({
      tenantId, actor: { tipo: "user", id: userId }, usuario: { id: userId, nombre: "c", email: `${userId}@prueba.cl`, platformRole: null }, rol: "viewer", permisosRol: ["portal_cliente:read"],
      portal: "cliente", portalesMembresia: ["cliente"], modulosActivos: ["portal_cliente", "finanzas"], medidor: { registrar: async () => undefined },
    });
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown) => mod.executeCapability(c, id, input);

  it("apagadas por defecto: el resumen no las ofrece y la lista queda prohibida", async () => {
    const r = await run(ctx(t.a, u.x), "portal_cliente.resumen.leer", {});
    expect(r.ok && (r.data as { facturas: boolean }).facturas).toBe(false);
    const l = await run(ctx(t.a, u.x), "portal_cliente.facturas.listar", {});
    expect(!l.ok && l.error.code).toBe("FORBIDDEN");
  });

  it("encendidas para la cuenta: solo lo emitido de su instalación, con páginas", async () => {
    await e.admin.configPortalCuenta.create({ data: { tenantId: t.a, cuentaId: cx, seccionesVisibles: ["cobertura", "facturas"] } });
    const r = await run(ctx(t.a, u.x), "portal_cliente.resumen.leer", {});
    expect(r.ok && (r.data as { facturas: boolean }).facturas).toBe(true);
    const p1 = await run(ctx(t.a, u.x), "portal_cliente.facturas.listar", { limite: 1 });
    if (!p1.ok) throw new Error(JSON.stringify(p1.error));
    const d1 = p1.data as Lista;
    expect(d1.items.map((f) => [f.folio, f.tipo, f.instalacion])).toEqual([[102, "Factura electrónica", "Planta"]]);
    const p2 = await run(ctx(t.a, u.x), "portal_cliente.facturas.listar", { limite: 1, cursor: d1.siguiente });
    expect(p2.ok && (p2.data as Lista).items.map((f) => f.folio)).toEqual([101]);
    expect(p2.ok && (p2.data as Lista).siguiente).toBeNull();
  });

  it("el PDF de otra instalación, de la cuenta sin instalación, de un borrador o de otra empresa no se revela", async () => {
    for (const k of ["bodega", "cuenta", "borrador", "ajena"]) {
      const p = await run(ctx(t.a, u.x), "portal_cliente.facturas.pdf", { documentoId: doc[k] });
      expect(!p.ok && p.error.code, k).toBe("NOT_FOUND");
    }
    const propia = await run(ctx(t.a, u.x), "portal_cliente.facturas.pdf", { documentoId: doc["planta"] });
    expect(propia.ok, JSON.stringify(propia.ok ? "" : propia.error)).toBe(true);
    expect(propia.ok && (propia.data as { mime: string }).mime).toBe("application/pdf");
    const otra = await run(ctx(t.b, u.b), "portal_cliente.facturas.listar", {});
    expect(!otra.ok && otra.error.code).toBe("FORBIDDEN");
  });
});
