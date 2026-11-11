// CAR-273: compras desde el RCV del SII contra Postgres real (si hay DATABASE_URL_TEST). Las credenciales de SimpleAPI
// se simulan y `fetch` responde un RCV ficticio: nada sale a la red. Datos de proveedores inventados.
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { trabajoSincronizarRcv } from "../src/finanzas/compras-rcv";

const estado = vi.hoisted(() => ({ conCreds: true }));
vi.mock("../src/finanzas/adaptador-sii", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  credencialesSimpleApi: async () =>
    estado.conCreds
      ? {
          apiKey: "AAAA-BBBB-CCCC-DDDD-EEEE",
          certificadoPfxBase64: Buffer.from([0x30, 0x82]).toString("base64"),
          certificadoClave: "clave-ficticia",
          certificadoRut: "11111111-1",
          rutEmpresa: "76111222-8",
          resolucionNumero: 0,
          resolucionFecha: "2024-01-01",
        }
      : null,
}));

const fila = (folio: number, extra: Record<string, unknown> = {}) => ({
  tipoDTE: 33,
  folio,
  fechaEmision: "2026-11-03T00:00:00",
  rutProveedor: "76.543.210-3",
  razonSocial: "Proveedor Ficticio SpA",
  montoNeto: 10_000,
  montoExento: 0,
  montoIvaRecuperable: 1_900,
  montoTotal: 11_900,
  ...extra,
});
const rcv = (filas: unknown[]) => vi.stubGlobal("fetch", vi.fn(async () => Response.json({ compras: { detalleCompras: filas } })));

describe.skipIf(!urlPropietario)("Finanzas · compras desde el RCV del SII (CAR-273)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  const registrados: unknown[] = [];
  const medidor = { registrar: async (c: unknown) => void registrados.push(c) };
  const usuarioId = randomUUID();
  const ctx = (actor: "user" | "system" = "user") =>
    mod.crearContexto({
      tenantId,
      actor: actor === "user" ? { tipo: "user", id: usuarioId } : { tipo: "system" },
      ...(actor === "user"
        ? { usuario: { id: usuarioId, nombre: "Admin", email: "admin@prueba.cl", platformRole: null }, rol: "owner" as const }
        : {}),
      portal: actor === "user" ? "erp" : null,
      portalesMembresia: ["erp"],
      modulosActivos: ["finanzas"],
      medidor,
    });
  const sincronizar = (dryRun = false) =>
    mod.executeCapability(ctx(), "finanzas.compras.sincronizar_rcv", { anio: 2026, mes: 11 }, { dryRun });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas]);
    tenantId = (await e.admin.tenant.create({ data: { slug: `fin-rcv-${randomUUID().slice(0, 8)}`, nombre: "Empresa Ficticia", vertical: "seguridad" } })).id;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    estado.conCreds = true;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("vista previa no escribe; la real crea proveedor y documentos, y repetir no duplica", async () => {
    rcv([fila(501), fila(502), fila(503, { tipoDTE: 46 }), fila(0)]);
    const prev = await sincronizar(true);
    expect(prev).toMatchObject({ ok: true, data: { recibidos: 3, nuevos: 2, omitidos: 2, proveedoresCreados: 1 } });
    expect(await e.admin.documentoRecibido.count({ where: { tenantId } })).toBe(0);

    const real = await sincronizar();
    expect(real).toMatchObject({ ok: true, data: { anio: 2026, mes: 11, nuevos: 2, duplicados: 0, proveedoresCreados: 1 } });
    const docs = await e.admin.documentoRecibido.findMany({ where: { tenantId }, orderBy: { folio: "asc" } });
    expect(docs.map((d) => [d.folio, d.origen, d.montoTotal])).toEqual([
      [501, "sii_rcv", 11_900],
      [502, "sii_rcv", 11_900],
    ]);

    rcv([fila(501), fila(502), fila(504)]);
    expect(await sincronizar()).toMatchObject({ ok: true, data: { nuevos: 1, duplicados: 2, proveedoresCreados: 0 } });
    expect(await e.admin.proveedor.count({ where: { tenantId } })).toBe(1);
    expect(registrados.length).toBeGreaterThanOrEqual(3);
  });

  it("sin Emisión DTE configurada: la capacidad lo dice y el trabajo no hace nada", async () => {
    estado.conCreds = false;
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await sincronizar()).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(await trabajoSincronizarRcv.ejecutar(ctx("system"), {})).toEqual({ activo: false });
    expect(f).not.toHaveBeenCalled();
  });

  it("el trabajo diario corre como sistema y crea proveedores sin rol", async () => {
    rcv([fila(601, { rutProveedor: "77.111.222-6", razonSocial: "Otro Proveedor Ficticio" })]);
    const r = await trabajoSincronizarRcv.ejecutar(ctx("system"), {});
    expect(r).toMatchObject({ activo: true, nuevos: 1 });
    expect(await e.admin.proveedor.count({ where: { tenantId, rut: "77111222-6" } })).toBe(1);
    // Sin executeCapability, el trabajo deja su propia auditoría en la misma transacción (ADR-052).
    const audit = await e.admin.auditEvent.findMany({ where: { tenantId, capability: "finanzas.compras.sincronizar_rcv", actorType: "system" } });
    expect(audit).toHaveLength(1);
  });
});
