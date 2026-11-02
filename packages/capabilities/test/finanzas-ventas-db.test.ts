// CAR-137 · Finanzas ventas DTE PR 1: emisión con SII simulado, folios y aislamiento RLS.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("Finanzas · ventas DTE (PR 1)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let tenantB = "";
  let cuentaId = "";
  let documentoB = "";
  const medidor = { registrar: async () => undefined };
  const usuarioId = randomUUID();
  const ctx = (tid = tenantId) =>
    mod.crearContexto({
      tenantId: tid,
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Admin de prueba", email: "admin@prueba.cl", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor,
    });
  const dato = async <T>(id: string, input: Record<string, unknown>, opts?: { dryRun?: boolean }): Promise<T> => {
    const r = await mod.executeCapability(ctx(), id, input, opts);
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data as T;
  };

  beforeAll(async () => {
    process.env.SII_ADAPTADOR = "simulado";
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas]);
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `fin-v-${randomUUID().slice(0, 8)}`, nombre: "Servicios Andes SpA", vertical: "seguridad" },
      })
    ).id;
    tenantB = (
      await e.admin.tenant.create({
        data: { slug: `fin-vb-${randomUUID().slice(0, 8)}`, nombre: "Otra Empresa SpA", vertical: "seguridad" },
      })
    ).id;
    cuentaId = (
      await e.admin.cuenta.create({
        data: { tenantId, nombre: "Cliente Ficticio Ltda.", rut: "77234567-8" },
      })
    ).id;
    await dato("finanzas.dte.configuracion.actualizar", {
      ambiente: "certificacion",
      rutEmisor: "76111222-3",
    });
    await dato("finanzas.folios.cargar_caf", {
      tipoDte: 33,
      folioDesde: 5000,
      folioHasta: 5002,
      cafVenceEn: "2027-12-31",
    });
    const cuentaB = (await e.admin.cuenta.create({ data: { tenantId: tenantB, nombre: "Cliente B", rut: "77999999-9" } })).id;
    documentoB = (
      await e.admin.documentoEmitido.create({
        data: {
          tenantId: tenantB,
          cuentaId: cuentaB,
          tipoDte: 33,
          folio: 1,
          fechaEmision: new Date("2026-11-01"),
          fechaVencimiento: new Date("2026-12-01"),
          montoNeto: 100_000,
          montoIva: 19_000,
          montoTotal: 119_000,
          estadoDte: "aceptado",
        },
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("crea borrador, emite con folio y envía al SII simulado hasta aceptado", async () => {
    const borrador = await dato<{ id: string; estadoDte: string }>("finanzas.ventas.crear_borrador", {
      cuentaId,
      tipoDte: 33,
      lineas: [{ glosa: "Servicio de guardias", monto: 200_000 }],
    });
    expect(borrador.estadoDte).toBe("borrador");
    await dato("finanzas.ventas.emitir", { documentoId: borrador.id }, { dryRun: true });
    const emitida = await dato<{ folio: number; estadoDte: string; montoTotal: number }>("finanzas.ventas.emitir", {
      documentoId: borrador.id,
    });
    expect(emitida).toMatchObject({ folio: 5000, estadoDte: "enviado", montoTotal: 238_000 });
    const enviada = await dato<{ estadoDte: string; trackIdSii: string | null }>("finanzas.ventas.enviar_sii", {
      documentoId: borrador.id,
    });
    expect(enviada.trackIdSii).toMatch(/^SIM-/);
    expect(enviada.estadoDte).toBe("aceptado");
    const pdf = await dato<{ mime: string; base64: string }>("finanzas.ventas.pdf", { documentoId: borrador.id });
    expect(pdf.mime).toBe("application/pdf");
    expect(pdf.base64.length).toBeGreaterThan(100);
  });

  it("consumirFolio asigna folios distintos en emisiones sucesivas", async () => {
    const b1 = await dato<{ id: string }>("finanzas.ventas.crear_borrador", {
      cuentaId,
      tipoDte: 33,
      lineas: [{ glosa: "A", monto: 10_000 }],
    });
    const b2 = await dato<{ id: string }>("finanzas.ventas.crear_borrador", {
      cuentaId,
      tipoDte: 33,
      lineas: [{ glosa: "B", monto: 10_000 }],
    });
    const e1 = await dato<{ folio: number }>("finanzas.ventas.emitir", { documentoId: b1.id });
    const e2 = await dato<{ folio: number }>("finanzas.ventas.emitir", { documentoId: b2.id });
    expect(e2.folio).toBe(e1.folio! + 1);
  });

  it("tenant A no obtiene documentos del tenant B (RLS)", async () => {
    const r = await mod.executeCapability(ctx(tenantId), "finanzas.ventas.obtener", { documentoId: documentoB });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const lista = await mod.executeCapability(ctx(tenantId), "finanzas.ventas.listar", {});
    expect(lista.ok && (lista.data as { items: unknown[] }).items).toEqual([]);
  });
});
