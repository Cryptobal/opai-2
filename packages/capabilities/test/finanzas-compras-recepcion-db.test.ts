// CAR-644: acuse de recepción ante el SII. Postgres real si hay DATABASE_URL_TEST; `fetch` simulado.
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

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

vi.mock("../src/finanzas/ventas-comun", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  ambienteDe: async () => "certificacion" as const,
}));

describe.skipIf(!urlPropietario)("Finanzas · recepción ante el SII (CAR-644)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let proveedorId = "";
  let docId = "";
  const usuarioId = randomUUID();
  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Admin", email: "admin@prueba.cl", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas]);
    tenantId = (await e.admin.tenant.create({ data: { slug: `fin-rcp-${randomUUID().slice(0, 8)}`, nombre: "Empresa Ficticia", vertical: "seguridad" } })).id;
    const pr = await mod.executeCapability(ctx(), "finanzas.proveedores.crear", {
      rut: "76.543.210-3",
      razonSocial: "Proveedor Acuse SpA",
      plazoPagoDias: 30,
    });
    if (!pr.ok) throw new Error("proveedor");
    proveedorId = (pr.data as { id: string }).id;
    const reg = await mod.executeCapability(ctx(), "finanzas.compras.registrar", {
      proveedorId,
      tipoDte: 33,
      folio: 77001,
      fechaEmision: "2026-11-10",
      fechaRecepcion: "2026-11-10",
      montoNeto: 50_000,
      montoIva: 9_500,
      montoTotal: 59_500,
    });
    if (!reg.ok) throw new Error("registrar");
    docId = (reg.data as { id: string }).id;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    estado.conCreds = true;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("vista previa no toca la base ni llama al SII", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const r = await mod.executeCapability(ctx(), "finanzas.compras.recepcion_sii", { documentoId: docId, accion: "reclamar_contenido" }, { dryRun: true });
    if (!r.ok) throw new Error("dryRun");
    expect(r.data).toMatchObject({ estadoNuevo: "reclamado", accionesSii: ["RCD"] });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    const row = await e.admin.documentoRecibido.findFirst({ where: { id: docId } });
    expect(row?.estadoRecepcion).toBe("pendiente_revision");
  });

  it("acusar actualiza el estado cuando SimpleAPI responde OK", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ descripcion: "Acción completada OK", trackId: "99" })));
    const r = await mod.executeCapability(
      ctx(),
      "finanzas.compras.recepcion_sii",
      { documentoId: docId, accion: "reclamar_total" },
      { dryRun: false, idempotencyKey: randomUUID() },
    );
    if (!r.ok) throw new Error(String(r.error.message));
    const row = await e.admin.documentoRecibido.findFirst({ where: { id: docId } });
    expect(row?.estadoRecepcion).toBe("reclamado");
    await expect(
      mod.executeCapability(ctx(), "finanzas.compras.recepcion_sii", { documentoId: docId, accion: "aceptar" }),
    ).toMatchObject({ ok: false });
  });
});