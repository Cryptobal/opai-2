// CAR-221 · A3b · destinatarios del correo de un DTE de venta con Postgres real: sugerencia desde la cuenta,
// guardado por documento (PARA / CC / BCC), envío con la lista guardada, respaldo en contactos y aislamiento.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Correo } from "@opai/integrations";

import { urlPropietario } from "../../db/test/entorno";
import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";

import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

type Dest = { tipo: string; email: string; origen: string };
type Guardado = { documentoId: string; para: string; cc: string[]; bcc: string[]; destinatarios: Dest[] };
type Sugerencia = { sugeridos: Dest[]; guardados: Dest[] };
type Envio = { estado: string; para: string; cc: string[]; bcc: string[] };

describe.skipIf(!urlPropietario)("Finanzas · destinatarios del documento (db)", () => {
  let s: VentasDbSuite;
  let borradorId = "";
  let emitidoId = "";
  const enviados: Correo[] = [];

  beforeAll(async () => {
    s = await prepararVentasDb({
      almacenamiento: almacenamientoEnMemoria().almacenamiento,
      correo: { nombre: "prueba", enviar: async (c) => void enviados.push(c) },
      urlBase: "https://test.opai.cl",
    });
    const contacto = (extra: Record<string, unknown>) =>
      s.e.admin.contacto.create({
        data: { tenantId: s.tenantId, cuentaId: s.cuentaId, nombres: "Ana", apellidos: "Pérez", ...extra },
      });
    await contacto({ email: "Pagos@cliente.cl", roles: ["facturacion"], esPrincipal: true });
    await contacto({ email: "comercial@cliente.cl", roles: ["comercial"] });
    await contacto({ email: "archivado@cliente.cl", roles: ["facturacion"], estado: "inactivo" });
    const crear = () =>
      s.dato<{ id: string }>("finanzas.ventas.crear_borrador", {
        cuentaId: s.cuentaId,
        tipoDte: 33,
        lineas: [{ glosa: "Servicio mensual", monto: 50_000 }],
      });
    borradorId = (await crear()).id;
    emitidoId = (await crear()).id;
    await s.dato("finanzas.ventas.emitir", { documentoId: emitidoId });
  });

  afterAll(async () => {
    await s?.e.cerrar();
  });

  it("sugiere la casilla DTE como PARA y los contactos activos de facturación en copia", async () => {
    await s.e.admin.cuenta.update({ where: { id: s.cuentaId }, data: { emailDte: "DTE@Cliente.cl" } });
    const r = await s.dato<Sugerencia>("finanzas.ventas.destinatarios_sugeridos", { cuentaId: s.cuentaId });
    expect(r.sugeridos).toEqual([
      { tipo: "PARA", email: "dte@cliente.cl", origen: "casilla_dte" },
      { tipo: "CC", email: "pagos@cliente.cl", origen: "contacto_facturacion" },
    ]);
    expect(r.guardados).toEqual([]);
  });

  it("la vista previa no escribe; guardar reemplaza la lista y la devuelve en el mismo orden", async () => {
    const lista = [
      { tipo: "PARA", email: "dte@cliente.cl", origen: "casilla_dte" },
      { tipo: "CC", email: "Pagos@cliente.cl", origen: "contacto_facturacion" },
      { tipo: "BCC", email: "Respaldo@gard.test", origen: "manual" },
    ];
    const vista = await s.dato<Guardado>("finanzas.ventas.guardar_destinatarios", { documentoId: borradorId, destinatarios: lista }, { dryRun: true });
    expect(vista).toMatchObject({ para: "dte@cliente.cl", cc: ["pagos@cliente.cl"], bcc: ["respaldo@gard.test"] });
    expect(await s.e.admin.documentoEmitidoDestinatario.count({ where: { documentoId: borradorId } })).toBe(0);

    await s.dato("finanzas.ventas.guardar_destinatarios", { documentoId: borradorId, destinatarios: lista });
    expect(await s.e.admin.documentoEmitidoDestinatario.count({ where: { documentoId: borradorId } })).toBe(3);
    await s.dato("finanzas.ventas.guardar_destinatarios", {
      documentoId: borradorId,
      destinatarios: [{ tipo: "PARA", email: "otro@cliente.cl" }],
    });
    const r = await s.dato<Sugerencia>("finanzas.ventas.destinatarios_sugeridos", { cuentaId: s.cuentaId, documentoId: borradorId });
    expect(r.guardados).toEqual([{ tipo: "PARA", email: "otro@cliente.cl", origen: "manual" }]);
  });

  it("rechaza listas sin PARA, con dos PARA, con repetidos, con correos rotos o de más", async () => {
    const intenta = (destinatarios: unknown[]) =>
      s.mod.executeCapability(s.ctx(), "finanzas.ventas.guardar_destinatarios", { documentoId: borradorId, destinatarios });
    const mensaje = (r: Awaited<ReturnType<typeof intenta>>) => (r.ok ? "" : r.error.message);
    expect(mensaje(await intenta([{ tipo: "CC", email: "a@x.cl" }]))).toMatch(/destinatario principal/);
    expect(mensaje(await intenta([{ tipo: "PARA", email: "a@x.cl" }, { tipo: "PARA", email: "b@x.cl" }]))).toMatch(/Solo puede haber un destinatario PARA/);
    expect(mensaje(await intenta([{ tipo: "PARA", email: "a@x.cl" }, { tipo: "BCC", email: "A@x.cl" }]))).toMatch(/repetido/);
    expect(mensaje(await intenta([{ tipo: "PARA", email: "no-es-correo" }]))).toMatch(/no es válido/);
    const veintiuno = Array.from({ length: 21 }, (_, i) => ({ tipo: i === 0 ? "PARA" : "CC", email: `u${i}@x.cl` }));
    expect((await intenta(veintiuno)).ok).toBe(false);
    // Ninguna petición rechazada tocó lo guardado.
    expect(await s.e.admin.documentoEmitidoDestinatario.count({ where: { documentoId: borradorId } })).toBe(1);
  });

  it("el envío usa la lista guardada: PARA, CC y BCC; sin lista cae en los contactos de facturación", async () => {
    const sin = await s.dato<Envio>("finanzas.ventas.enviar_cliente", { documentoId: emitidoId });
    expect(sin).toMatchObject({ estado: "enviado", para: "pagos@cliente.cl", cc: [], bcc: [] });
    expect(enviados[0]).toMatchObject({ para: "pagos@cliente.cl" });
    expect("bcc" in (enviados[0] ?? {})).toBe(false);

    await s.dato("finanzas.ventas.guardar_destinatarios", {
      documentoId: emitidoId,
      destinatarios: [
        { tipo: "PARA", email: "dte@cliente.cl", origen: "casilla_dte" },
        { tipo: "CC", email: "pagos@cliente.cl", origen: "contacto_facturacion" },
        { tipo: "BCC", email: "respaldo@gard.test" },
      ],
    });
    const vista = await s.dato<Envio>("finanzas.ventas.enviar_cliente", { documentoId: emitidoId, reenviar: true }, { dryRun: true });
    expect(vista).toMatchObject({ estado: "vista_previa", para: "dte@cliente.cl", cc: ["pagos@cliente.cl"], bcc: ["respaldo@gard.test"] });
    const r = await s.dato<Envio>("finanzas.ventas.enviar_cliente", { documentoId: emitidoId, reenviar: true });
    expect(r).toMatchObject({ estado: "enviado", para: "dte@cliente.cl", cc: ["pagos@cliente.cl"], bcc: ["respaldo@gard.test"] });
    expect(enviados[1]).toMatchObject({ para: "dte@cliente.cl", cc: ["pagos@cliente.cl"], bcc: ["respaldo@gard.test"] });
    const envio = await s.e.admin.documentoEmitidoEnvio.findFirstOrThrow({ where: { documentoId: emitidoId }, orderBy: { createdAt: "desc" } });
    expect(envio.destinatarios).toEqual(["dte@cliente.cl", "pagos@cliente.cl", "respaldo@gard.test"]);
  });

  it("otra empresa no ve, sugiere ni guarda destinatarios de este documento", async () => {
    const ver = await s.mod.executeCapability(s.ctx(s.tenantB), "finanzas.ventas.destinatarios_sugeridos", { cuentaId: s.cuentaId, documentoId: emitidoId });
    expect(ver).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const guardar = await s.mod.executeCapability(s.ctx(s.tenantB), "finanzas.ventas.guardar_destinatarios", {
      documentoId: emitidoId,
      destinatarios: [{ tipo: "PARA", email: "intruso@x.cl" }],
    });
    expect(guardar).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await s.e.admin.documentoEmitidoDestinatario.count({ where: { documentoId: emitidoId, email: "intruso@x.cl" } })).toBe(0);
  });

  it("la base rechaza un destinatario de la empresa B sobre un documento de la A (trigger mismo_tenant)", async () => {
    await expect(
      s.e.admin.documentoEmitidoDestinatario.create({
        data: { tenantId: s.tenantB, documentoId: emitidoId, orden: 9, tipo: "CC", email: "cruce@x.cl", origen: "manual" },
      }),
    ).rejects.toThrow(/otra empresa|Foreign key|mismo/i);
    expect(await s.e.admin.documentoEmitidoDestinatario.count({ where: { email: "cruce@x.cl" } })).toBe(0);
  });

  it("rol sin permiso de ventas no puede sugerir ni guardar", async () => {
    const r = await s.mod.executeCapability(
      s.mod.crearContexto({
        tenantId: s.tenantId,
        actor: { tipo: "user", id: "00000000-0000-4000-8000-000000000001" },
        usuario: { id: "00000000-0000-4000-8000-000000000001", nombre: "Viewer", email: "v@prueba.cl", platformRole: null },
        portal: "erp",
        portalesMembresia: ["erp"],
        rol: "viewer",
        modulosActivos: ["finanzas"],
        medidor: { registrar: async () => undefined },
      }),
      "finanzas.ventas.guardar_destinatarios",
      { documentoId: emitidoId, destinatarios: [{ tipo: "PARA", email: "a@x.cl" }] },
    );
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});
