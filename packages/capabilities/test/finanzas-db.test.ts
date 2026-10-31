// Brief 23 · Finanzas compras PR 1: plan de cuentas, proveedores y libro de compras contra Postgres
// real (si hay DATABASE_URL_TEST). Cubre validación, autorización por rol, dryRun, idempotencia de la
// importación y la sugerencia de centro de costo. El aislamiento entre tenants está en
// finanzas-aislamiento-db.test.ts.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;
type Datos = Record<string, unknown>;

describe.skipIf(!urlPropietario)("Finanzas · Compras (PR 1)", () => {
  let e: Entorno;
  let mod: Capacidades;
  let tenantId = "";
  let instalacionId = "";
  const medidor = { registrar: async () => undefined };
  const usuarioId = randomUUID();

  const ctxRol = (rol: "owner" | "admin" | "gerente" | "supervisor" | "viewer") =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Admin de prueba", email: "admin@prueba.cl", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol,
      modulosActivos: ["finanzas"],
      medidor,
    });
  const ejecutar = (id: string, input: Datos, opts?: { dryRun?: boolean }, rol: Parameters<typeof ctxRol>[0] = "owner") =>
    mod.executeCapability(ctxRol(rol), id, input, opts);
  const dato = async <T>(id: string, input: Datos, opts?: { dryRun?: boolean }): Promise<T> => {
    const r = await ejecutar(id, input, opts);
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data as T;
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas]);
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `fin-${randomUUID().slice(0, 8)}`, nombre: "Atlas Seguridad SpA", vertical: "seguridad" },
      })
    ).id;
    const cuentaId = (await e.admin.cuenta.create({ data: { tenantId, nombre: "Cliente Norte" } })).id;
    instalacionId = (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre: "Planta Quilicura" } })).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("solo owner y admin entran: gerente, supervisor y viewer reciben FORBIDDEN", async () => {
    for (const rol of ["gerente", "supervisor", "viewer"] as const) {
      const r = await ejecutar("finanzas.compras.listar", {}, undefined, rol);
      expect(r, rol).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    }
    expect((await ejecutar("finanzas.compras.listar", {}, undefined, "admin")).ok).toBe(true);
  });

  it("carga la plantilla chilena una sola vez y queda sin errores de validación", async () => {
    const vista = await dato<{ creadas: number }>("finanzas.plan.inicializar", {}, { dryRun: true });
    expect(vista.creadas).toBeGreaterThan(30);
    expect(await e.admin.cuentaContable.count({ where: { tenantId } })).toBe(0);
    await dato("finanzas.plan.inicializar", {});
    const otra = await dato<{ creadas: number; yaInicializado: boolean }>("finanzas.plan.inicializar", {});
    expect(otra).toEqual({ creadas: 0, yaInicializado: true });
    const plan = await dato<{ alertas: { severidad: string }[]; inicializado: boolean }>("finanzas.plan.listar", {});
    expect(plan.inicializado).toBe(true);
    expect(plan.alertas.filter((a) => a.severidad === "error")).toEqual([]);
  });

  it("rechaza dejar deudores por venta en el grupo no corriente", async () => {
    const plan = await dato<{ cuentas: { id: string; claveSistema: string | null }[] }>("finanzas.plan.listar", {});
    const deudores = plan.cuentas.find((c) => c.claveSistema === "deudores_por_venta")!;
    const r = await ejecutar("finanzas.plan.actualizar", { id: deudores.id, grupo: "no_corriente" });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const nueva = await ejecutar("finanzas.plan.crear", {
      codigo: "1.1.50",
      nombre: "Otro IVA crédito",
      tipo: "activo",
      grupo: "corriente",
      claveSistema: "iva_credito",
    });
    expect(nueva).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("crea una cuenta nueva con la naturaleza habitual de su tipo", async () => {
    const c = await dato<{ naturaleza: string; exigeCentroCosto: boolean }>("finanzas.plan.crear", {
      codigo: "6.1.90",
      nombre: "Seguros",
      tipo: "gasto",
      exigeCentroCosto: true,
    });
    expect(c).toMatchObject({ naturaleza: "deudora", exigeCentroCosto: true });
  });

  it("crea un proveedor: valida el RUT, no repite y respeta dryRun", async () => {
    expect(await ejecutar("finanzas.proveedores.crear", { rut: "11.111.111-2", razonSocial: "Mal RUT Ltda." })).toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
    const entrada = { rut: "76.543.210-3", razonSocial: "Uniformes del Sur SpA", centro: { tipo: "instalacion", instalacionId } };
    await dato("finanzas.proveedores.crear", entrada, { dryRun: true });
    expect(await e.admin.proveedor.count({ where: { tenantId } })).toBe(0);
    expect(await e.admin.centroCosto.count({ where: { tenantId } })).toBe(0);
    const p = await dato<{ plazoPagoDias: number; centroCostoId: string | null }>("finanzas.proveedores.crear", entrada);
    expect(p.plazoPagoDias).toBe(30);
    expect(p.centroCostoId).not.toBeNull();
    expect(await ejecutar("finanzas.proveedores.crear", entrada)).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  });

  it("la cuenta de gasto por defecto debe ser de gasto o costo", async () => {
    const plan = await dato<{ cuentas: { id: string; claveSistema: string | null }[] }>("finanzas.plan.listar", {});
    const banco = plan.cuentas.find((c) => c.claveSistema === "bancos")!;
    const r = await ejecutar("finanzas.proveedores.crear", {
      rut: "77.123.456-9",
      razonSocial: "Cuenta equivocada SA",
      cuentaGastoId: banco.id,
    });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });
});
