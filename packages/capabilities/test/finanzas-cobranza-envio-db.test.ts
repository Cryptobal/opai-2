// F4 (CAR-166) · recordatorios de cobranza con Postgres real: envío manual con copia, historial, pausa,
// trabajo diario apagado por defecto y secuencia idempotente por paso.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Correo } from "@opai/integrations";

import { urlPropietario } from "../../db/test/entorno";
import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";

import { trabajoRecordatoriosCobranza } from "../src/finanzas/cobranza-trabajo";
import { registrarModuloFinanzas } from "./finanzas-modulo";
import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

type Envio = { estado: string; para: string | null; cc: string[] };
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

  it("recuerda al contacto principal con copia al resto y deja la gestión", async () => {
    await contacto("pagos@cliente.cl", ["facturacion"], true);
    await contacto("conta@cliente.cl", ["facturacion"]);
    await contacto("gerente@cliente.cl", ["comercial"]);
    const vista = await s.dato<Envio>("finanzas.cobranza.recordar", { documentoId: docId }, { dryRun: true });
    expect(vista).toMatchObject({ estado: "vista_previa", para: "pagos@cliente.cl", cc: ["conta@cliente.cl"] });
    const r = await s.dato<Envio>("finanzas.cobranza.recordar", { documentoId: docId });
    expect(r).toMatchObject({ estado: "enviado", para: "pagos@cliente.cl", cc: ["conta@cliente.cl"] });
    expect(enviados).toHaveLength(1);
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
