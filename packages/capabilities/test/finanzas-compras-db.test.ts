// Brief 23 · Finanzas compras PR 1: libro de compras contra Postgres real (si hay DATABASE_URL_TEST):
// registro, importación idempotente, sugerencia y asignación en lote del centro de costo, y los
// totales con la nota de crédito restando.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Datos = Record<string, unknown>;
type Compra = { id: string; centroCostoId: string | null; sugerencia: { origen: string; centroCostoId: string } | null; estadoPago: string };

describe.skipIf(!urlPropietario)("Finanzas · libro de compras (PR 1)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let instalacionId = "";
  let proveedorId = "";
  const medidor = { registrar: async () => undefined };
  const usuarioId = randomUUID();
  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Admin de prueba", email: "admin@prueba.cl", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor,
    });
  const ejecutar = (id: string, input: Datos, opts?: { dryRun?: boolean }) => mod.executeCapability(ctx(), id, input, opts);
  // Mismo acceso que `ctx()` salvo que niega `finanzas:proveedores.manage` (review 5720654705 del
  // Revisor, CAR-98): sirve para probar que `finanzas.compras.importar` exige ese permiso además de
  // `finanzas:compras.manage` cuando va a crear un proveedor nuevo.
  const ctxSinProveedores = () => {
    const base = ctx();
    return { ...base, autorizar: (p: string) => p !== "finanzas:proveedores.manage" && base.autorizar(p) };
  };
  const ejecutarSinProveedores = (id: string, input: Datos, opts?: { dryRun?: boolean }) =>
    mod.executeCapability(ctxSinProveedores(), id, input, opts);
  const dato = async <T>(id: string, input: Datos, opts?: { dryRun?: boolean }): Promise<T> => {
    const r = await ejecutar(id, input, opts);
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data as T;
  };
  const doc = (folio: number, extra: Datos = {}) => ({
    proveedorId,
    tipoDte: 33,
    folio,
    fechaEmision: "2026-10-05",
    fechaRecepcion: "2026-10-06",
    montoNeto: 100_000,
    montoIva: 19_000,
    ...extra,
  });
  const libro = (extra: Datos = {}) =>
    dato<{ items: Compra[]; resumen: { documentos: number; sinCentroCosto: number; neto: number; total: number } }>(
      "finanzas.compras.listar",
      { periodo: "2026-10", ...extra },
    );

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas]);
    tenantId = (await e.admin.tenant.create({ data: { slug: `fin-c-${randomUUID().slice(0, 8)}`, nombre: "Atlas Seguridad SpA", vertical: "seguridad" } })).id;
    const cuentaId = (await e.admin.cuenta.create({ data: { tenantId, nombre: "Cliente Norte" } })).id;
    instalacionId = (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre: "Bodega Lampa" } })).id;
    proveedorId = (await dato<{ id: string }>("finanzas.proveedores.crear", { rut: "76.543.210-3", razonSocial: "Uniformes del Sur SpA", plazoPagoDias: 45 })).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("registra un documento: dryRun no escribe, el total debe cuadrar y no se repite", async () => {
    await dato("finanzas.compras.registrar", doc(1001), { dryRun: true });
    expect(await e.admin.documentoRecibido.count({ where: { tenantId } })).toBe(0);
    const c = await dato<Compra & { vencimientoPago: string; montoTotal: number }>("finanzas.compras.registrar", doc(1001));
    expect(c).toMatchObject({ montoTotal: 119_000, estadoPago: "sin_conciliar", centroCostoId: null, vencimientoPago: "2026-11-19" });
    expect(await ejecutar("finanzas.compras.registrar", doc(1001))).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(await ejecutar("finanzas.compras.registrar", doc(1002, { montoTotal: 120_000 }))).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("sin antecedentes no hay sugerencia; con la última compra con centro, se sugiere ese", async () => {
    await dato("finanzas.compras.registrar", doc(1002, { fechaRecepcion: "2026-10-07" }));
    let l = await libro({ sinCentroCosto: true });
    expect(l.items.map((i) => i.sugerencia)).toEqual([null, null]);
    await dato("finanzas.compras.registrar", doc(1003, { fechaEmision: "2026-10-08", centro: { tipo: "instalacion", instalacionId } }));
    l = await libro({ sinCentroCosto: true });
    expect(l.items).toHaveLength(2);
    expect(l.items.every((i) => i.sugerencia?.origen === "ultima_compra")).toBe(true);
  });

  it("asigna centro en lote: vista previa sin escribir, y no pisa un centro ya asignado", async () => {
    const sin = (await libro({ sinCentroCosto: true })).items.map((i) => i.id);
    const prev = await dato<{ aplican: string[] }>("finanzas.compras.asignar_centro", { documentoIds: sin, centro: { tipo: "general" } }, { dryRun: true });
    expect(prev.aplican).toHaveLength(2);
    expect(await e.admin.centroCosto.count({ where: { tenantId, tipo: "general" } })).toBe(0);
    const real = await dato<{ aplican: string[]; centroCostoNombre: string }>("finanzas.compras.asignar_centro", { documentoIds: sin, centro: { tipo: "general" } });
    expect(real.centroCostoNombre).toBe("Administración / Oficina central");
    expect((await libro({ sinCentroCosto: true })).items).toHaveLength(0);
    const todos = (await libro()).items.map((i) => i.id);
    const sinPisar = await dato<{ aplican: string[]; conOtroCentro: string[] }>("finanzas.compras.asignar_centro", { documentoIds: todos, centro: { tipo: "instalacion", instalacionId } });
    expect(sinPisar.conOtroCentro).toHaveLength(2);
    expect(sinPisar.aplican).toHaveLength(0);
  });

  it("importa en lote: vista previa, filas con error sin frenar, y repetir no duplica", async () => {
    const filas = [
      { proveedorRut: "76.543.210-3", ...doc(2001), proveedorId: undefined },
      { proveedorRut: "77.123.456-9", proveedorRazonSocial: "Seguridad Austral Ltda.", ...doc(2002), proveedorId: undefined },
      { proveedorRut: "11.111.111-2", ...doc(2003), proveedorId: undefined },
      { proveedorRut: "76.543.210-3", ...doc(1001), proveedorId: undefined },
    ];
    const prev = await dato<{ nuevos: number; duplicados: number; errores: number }>("finanzas.compras.importar", { documentos: filas, crearProveedores: true }, { dryRun: true });
    expect(prev).toMatchObject({ nuevos: 2, duplicados: 1, errores: 1 });
    expect(await e.admin.documentoRecibido.count({ where: { tenantId, folio: { in: [2001, 2002] } } })).toBe(0);
    const real = await dato<{ nuevos: number; proveedoresCreados: number }>("finanzas.compras.importar", { documentos: filas, crearProveedores: true });
    expect(real).toMatchObject({ nuevos: 2, proveedoresCreados: 1 });
    const otra = await dato<{ nuevos: number; duplicados: number }>("finanzas.compras.importar", { documentos: filas, crearProveedores: true });
    expect(otra).toMatchObject({ nuevos: 0, duplicados: 3 });
  });

  it("importar con crearProveedores exige también el permiso de proveedores (vista previa y real)", async () => {
    const soloCompras = mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Contador", email: "contador@prueba.cl", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "viewer",
      excepciones: [
        { permiso: "finanzas:read", conceder: true },
        { permiso: "finanzas:compras.manage", conceder: true },
      ],
      modulosActivos: ["finanzas"],
      medidor,
    });
    const entrada = {
      documentos: [{ proveedorRut: "78.000.000-7", proveedorRazonSocial: "Nuevo Ltda.", ...doc(4001), proveedorId: undefined }],
      crearProveedores: true,
    };
    for (const dryRun of [true, false]) {
      const r = await mod.executeCapability(soloCompras, "finanzas.compras.importar", entrada, { dryRun });
      expect(r, String(dryRun)).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    }
    expect(await e.admin.proveedor.count({ where: { tenantId, rut: "78000000-7" } })).toBe(0);
    // Sin crear proveedores, con uno existente, quien solo tiene compras sí importa.
    const existente = { documentos: [{ proveedorRut: "76.543.210-3", ...doc(4002), proveedorId: undefined }] };
    expect(await mod.executeCapability(soloCompras, "finanzas.compras.importar", existente)).toMatchObject({ ok: true });
  });

  it("los totales del libro restan las notas de crédito", async () => {
    await dato("finanzas.compras.registrar", doc(3001, { tipoDte: 61, montoNeto: 10_000, montoIva: 1_900 }));
    const l = await libro();
    const brutos = 6 * 100_000;
    expect(l.resumen.documentos).toBe(7);
    expect(l.resumen.neto).toBe(brutos - 10_000);
  });

  it("sin proveedores.manage, importar un proveedor nuevo falla prohibido en dryRun y en real, sin escribir nada", async () => {
    const filas = [{ proveedorRut: "19.876.543-0", proveedorRazonSocial: "Suministros Ficticios SpA", ...doc(5001), proveedorId: undefined }];
    const prev = await ejecutarSinProveedores("finanzas.compras.importar", { documentos: filas, crearProveedores: true }, { dryRun: true });
    expect(prev).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    const real = await ejecutarSinProveedores("finanzas.compras.importar", { documentos: filas, crearProveedores: true });
    expect(real).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await e.admin.proveedor.count({ where: { tenantId, rut: "19876543-0" } })).toBe(0);
    expect(await e.admin.documentoRecibido.count({ where: { tenantId, folio: 5001 } })).toBe(0);
  });

  it("con proveedores.manage, importar un proveedor nuevo crea el proveedor y el documento", async () => {
    const filas = [{ proveedorRut: "19.876.543-0", proveedorRazonSocial: "Suministros Ficticios SpA", ...doc(5002), proveedorId: undefined }];
    const real = await dato<{ nuevos: number; proveedoresCreados: number }>("finanzas.compras.importar", { documentos: filas, crearProveedores: true });
    expect(real).toMatchObject({ nuevos: 1, proveedoresCreados: 1 });
    expect(await e.admin.proveedor.count({ where: { tenantId, rut: "19876543-0" } })).toBe(1);
  });

  it("sin proveedores.manage pero sin proveedores nuevos, la importación pasa igual", async () => {
    const filas = [{ proveedorRut: "76.543.210-3", ...doc(5003), proveedorId: undefined }];
    const real = await ejecutarSinProveedores("finanzas.compras.importar", { documentos: filas, crearProveedores: true });
    expect(real).toMatchObject({ ok: true, data: { nuevos: 1, proveedoresCreados: 0 } });
  });
});
