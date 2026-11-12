// F4 (CAR-166) · recordatorios de cobranza con Postgres real: envío manual con copia, historial, pausa,
// trabajo diario apagado por defecto y secuencia idempotente por paso.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Correo } from "@opai/integrations";

import { urlPropietario } from "../../db/test/entorno";
import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";

import { trabajoRecordatoriosCobranza } from "../src/finanzas/cobranza-trabajo";
import { registrarModuloFinanzas } from "./finanzas-modulo";
import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

type Envio = { estado: string; para: string | null; paraAdicionales: string[]; cc: string[] };
type Job = { activo: boolean; enviados: number; omitidos: number; fallidos: number };

const diasAtras = (n: number): Date => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
};

describe.skipIf(!urlPropietario)("Finanzas · cobranza · recordatorios (db)", () => {
  let s: VentasDbSuite;
  let docId: string;
  const enviados: Correo[] = [];

  beforeAll(async () => {
    s = await prepararVentasDb({
      almacenamiento: almacenamientoEnMemoria().almacenamiento,
      correo: { nombre: "prueba", enviar: async (c) => void enviados.push(c) },
      urlBase: "https://test.opai.cl",
    });
    registrarModuloFinanzas();
    const d = await s.e.admin.documentoEmitido.create({
      data: {
        tenantId: s.tenantId, cuentaId: s.cuentaId, tipoDte: 33, folio: 9201, estadoDte: "aceptado", timbrePdf417: "<TED>prueba</TED>",
        fechaEmision: diasAtras(60), fechaVencimiento: diasAtras(30), montoNeto: 500_000, montoTotal: 500_000,
      },
    });
    docId = d.id;
  });

  afterAll(async () => {
    await s?.e.cerrar();
  });

  const contacto = (email: string, roles: string[], esPrincipal = false) =>
    s.e.admin.contacto.create({
      data: { tenantId: s.tenantId, cuentaId: s.cuentaId, nombres: "Ana", apellidos: "Pérez", email, roles, esPrincipal },
    });

  it("sin contactos de facturación no hay a quién recordar", async () => {
    const r = await s.mod.executeCapability(s.ctx(), "finanzas.cobranza.recordar", { documentoId: docId });
    expect(r.ok).toBe(false);
    expect(enviados).toHaveLength(0);
  });

  it("recuerda a todos los contactos de facturación como PARA y deja la gestión (ADR-103)", async () => {
    await contacto("pagos@cliente.cl", ["facturacion"], true);
    await contacto("conta@cliente.cl", ["facturacion"]);
    await contacto("gerente@cliente.cl", ["comercial"]);
    await s.e.admin.cuenta.update({ where: { id: s.cuentaId }, data: { emailDte: "dte@cliente.cl" } });
    const vista = await s.dato<Envio>("finanzas.cobranza.recordar", { documentoId: docId }, { dryRun: true });
    expect(vista).toMatchObject({ estado: "vista_previa", para: "pagos@cliente.cl", paraAdicionales: ["conta@cliente.cl"], cc: ["dte@cliente.cl"] });
    const r = await s.dato<Envio>("finanzas.cobranza.recordar", { documentoId: docId });
    expect(r).toMatchObject({ estado: "enviado", para: "pagos@cliente.cl", paraAdicionales: ["conta@cliente.cl"], cc: ["dte@cliente.cl"] });
    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toMatchObject({ para: "pagos@cliente.cl", paraAdicionales: ["conta@cliente.cl"], cc: ["dte@cliente.cl"] });
    const gestiones = await s.e.admin.cobranzaGestion.findMany({ where: { documentoId: docId } });
    expect(gestiones).toMatchObject([{ canal: "correo", origen: "manual", resultado: "enviado", paso: null }]);
  });

  it("pausar y anotar gestiones queda en el historial", async () => {
    await s.dato("finanzas.cobranza.pausar", { documentoId: docId, pausada: true });
    expect((await s.e.admin.documentoEmitido.findUniqueOrThrow({ where: { id: docId } })).cobranzaPausada).toBe(true);
    await s.dato("finanzas.cobranza.registrar_gestion", { documentoId: docId, detalle: "Prometió pagar el viernes." });
    await s.dato("finanzas.cobranza.pausar", { documentoId: docId, pausada: false });
    expect(await s.e.admin.cobranzaGestion.count({ where: { documentoId: docId } })).toBe(4);
  });

  it("el trabajo diario no envía nada si la empresa no activó los automáticos", async () => {
    const antes = enviados.length;
    const r = (await trabajoRecordatoriosCobranza.ejecutar(s.ctx(), {})) as Job;
    expect(r).toMatchObject({ activo: false, enviados: 0 });
    expect(enviados.length).toBe(antes);
  });

  it("activado, envía el primer paso una sola vez aunque corra dos veces", async () => {
    await s.dato("core.config.set", { modulo: "finanzas", clave: "cobranza_recordatorios_automaticos", valor: true });
    // Vence hace 30 días: los pasos de 3, 7 y 12 días hábiles ya llegaron; sale uno por ejecución.
    const antes = enviados.length;
    const a = (await trabajoRecordatoriosCobranza.ejecutar(s.ctx(), {})) as Job;
    expect(a).toMatchObject({ activo: true, enviados: 1 });
    const pasos = await s.e.admin.cobranzaGestion.findMany({
      where: { documentoId: docId, origen: "automatico" },
      select: { paso: true, resultado: true },
    });
    expect(pasos).toEqual([{ paso: 1, resultado: "enviado" }]);
    await s.dato("finanzas.cobranza.pausar", { documentoId: docId, pausada: true });
    const b = (await trabajoRecordatoriosCobranza.ejecutar(s.ctx(), {})) as Job;
    expect(b.enviados).toBe(0); // pausada: no sale el paso 2
    expect(enviados.length).toBe(antes + 1);
  });

  it("una factura vencida importada de 1.0 no genera recordatorio automático", async () => {
    await contacto("facturacion@cliente.test", ["facturacion"], true);
    const imp = await s.e.admin.documentoEmitido.create({
      data: {
        tenantId: s.tenantId, cuentaId: s.cuentaId, tipoDte: 33, folio: 9202, estadoDte: "aceptado",
        fechaEmision: diasAtras(60), fechaVencimiento: diasAtras(30), montoNeto: 100_000, montoTotal: 100_000,
      },
    });
    const corrida = await s.e.admin.importacion.create({
      data: { tenantId: s.tenantId, origen: "instantanea", versionContrato: "finanzas-apertura@1", modo: "aplicar", estado: "completada", terminadaEn: new Date() },
    });
    await s.e.admin.importacionFila.create({
      data: { tenantId: s.tenantId, importacionId: corrida.id, entidad: "documento_cobrar", id10: "33-9202", id20: imp.id, accion: "creado" },
    });
    const antes = enviados.length;
    const r = (await trabajoRecordatoriosCobranza.ejecutar(s.ctx(), {})) as Job;
    expect(r.enviados).toBe(0);
    expect(enviados.length).toBe(antes);
    expect(await s.e.admin.cobranzaGestion.count({ where: { documentoId: imp.id } })).toBe(0);
  });

  it("«Hoy en Finanzas» no cuenta lo importado de 1.0 entre los recordatorios que tocan (CAR-193)", async () => {
    type Resumen = { cobrar: { vencidas: { cantidad: number }; recordatoriosQueTocan: { cantidad: number } } };
    // Una factura vencida normal (no importada, no pausada, sin pasos enviados): esta sí toca.
    await s.e.admin.documentoEmitido.create({
      data: {
        tenantId: s.tenantId, cuentaId: s.cuentaId, tipoDte: 33, folio: 9203, estadoDte: "aceptado",
        fechaEmision: diasAtras(60), fechaVencimiento: diasAtras(30), montoNeto: 200_000, montoTotal: 200_000,
      },
    });
    const r = await s.dato<Resumen>("finanzas.hoy.resumen", {});
    // Las tres siguen vencidas (hay que cobrarlas), pero solo le toca recordatorio a la normal: la primera está
    // pausada y la importada de 1.0 queda fuera por decisión de Carlos.
    expect(r.cobrar.vencidas.cantidad).toBe(3);
    expect(r.cobrar.recordatoriosQueTocan.cantidad).toBe(1);
  });

  it("la lista guardada del documento manda: las copias ocultas siguen ocultas", async () => {
    const d = await s.e.admin.documentoEmitido.create({
      data: {
        tenantId: s.tenantId, cuentaId: s.cuentaId, tipoDte: 33, folio: 9204, estadoDte: "aceptado", timbrePdf417: "<TED>prueba</TED>",
        fechaEmision: diasAtras(60), fechaVencimiento: diasAtras(30), montoNeto: 50_000, montoTotal: 50_000,
      },
    });
    await s.e.admin.documentoEmitidoDestinatario.createMany({
      data: [
        { tenantId: s.tenantId, documentoId: d.id, orden: 0, tipo: "PARA", email: "jefa@cliente.cl", origen: "manual" },
        { tenantId: s.tenantId, documentoId: d.id, orden: 1, tipo: "BCC", email: "oculto@cliente.cl", origen: "manual" },
      ],
    });
    const antes = enviados.length;
    const r = await s.dato<Envio>("finanzas.cobranza.recordar", { documentoId: d.id });
    expect(r).toMatchObject({ estado: "enviado", para: "jefa@cliente.cl", paraAdicionales: [], cc: ["dte@cliente.cl"] });
    expect(enviados[antes]).toMatchObject({ para: "jefa@cliente.cl", cc: ["dte@cliente.cl"], bcc: ["oculto@cliente.cl"] });
  });

  it("otra empresa no puede recordar ni pausar este documento", async () => {
    for (const [id, input] of [
      ["finanzas.cobranza.recordar", { documentoId: docId }],
      ["finanzas.cobranza.pausar", { documentoId: docId, pausada: true }],
    ] as const) {
      const r = await s.mod.executeCapability(s.ctx(s.tenantB), id, input);
      expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    }
  });
});
