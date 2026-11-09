// Opciones de la programación antes de la factura (CAR-221), con datos ficticios y correo SIMULADO capturado:
// el día acordado de envío (el borrador se crea al generar; los previos salen el día acordado, una sola vez),
// «esperar el OK» opcional (apagado: informa; encendido: bloquea emitir) y «exige OC». Sin correos ni DTE reales.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { fechaEnvioPrevios } from "@opai/domain";
import type { Correo } from "@opai/integrations";

import { urlPropietario } from "../../db/test/entorno";
import { enviarPreviosPendientes } from "../src/finanzas/ventas-programacion-previos";

import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

const hoy = new Date().toISOString().slice(0, 10);
const mesActual = hoy.slice(0, 7);
const ultimoDiaDelMes = (() => {
  const [a, m] = hoy.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
})();

type Gen = { resultados: { estado: string; fecha: string; documentoId: string | null }[] };

describe.skipIf(!urlPropietario)("programación · día acordado, esperar OK opcional y exige OC", () => {
  let s: VentasDbSuite;
  const enviados: Correo[] = [];
  let contactoId = "";

  const base = (extra: Record<string, unknown>) => ({
    nombre: "Servicio con opciones",
    cuentaId: s.cuentaId,
    tipoDte: 33,
    frecuencia: "mensual",
    diaGeneracion: 1,
    plazoPagoDias: 30,
    fechaInicio: `${mesActual}-01`,
    lineas: [{ glosa: "Servicio de guardias", cantidad: "1", precioUnitario: 1_000_000, descuentoPct: 0 }],
    destinatarioIds: [contactoId],
    ...extra,
  });
  async function generar(extra: Record<string, unknown>) {
    const p = await s.dato<{ id: string }>("finanzas.ventas_programacion.crear", base(extra));
    await s.dato("finanzas.ventas_programacion.cambiar_estado", { programacionId: p.id, activa: true });
    const g = await s.dato<Gen>("finanzas.ventas_programacion.generar", { programacionId: p.id });
    return { id: p.id, documentoId: g.resultados.find((r) => r.estado === "generado")!.documentoId! };
  }
  const previos = () => enviados.filter((c) => /^(Proforma|Estado de pago) - /.test(c.asunto));

  beforeAll(async () => {
    s = await prepararVentasDb({ correo: { nombre: "simulado", enviar: async (c) => void enviados.push(c) }, urlBase: "https://qa.opai.test" });
    contactoId = (
      await s.e.admin.contacto.create({
        data: { tenantId: s.tenantId, cuentaId: s.cuentaId, nombres: "Ana", apellidos: "Ficticia", email: "pagos@cliente-ficticio.test", roles: ["facturacion"] },
      })
    ).id;
  }, 120_000);
  afterAll(async () => {
    await s?.e.cerrar();
  });

  it("con día acordado posterior, el borrador se crea sin mandar nada y el trabajo diario lo manda ese día, una sola vez", async () => {
    if (hoy.slice(8) === String(ultimoDiaDelMes)) return; // el último día del mes el día acordado 31 ya llegó
    const antes = previos().length;
    const { documentoId } = await generar({ autoEnvioProforma: true, previoCuando: "fecha_acordada", previoDia: 31 });
    expect(previos().length).toBe(antes);
    const corrida = await s.e.admin.ventasProgramacionCorrida.findFirstOrThrow({ where: { documentoId } });
    expect(corrida.previosEnviarEn?.toISOString().slice(0, 10)).toBe(fechaEnvioPrevios(`${mesActual}-01`, "fecha_acordada", 31));
    expect(corrida.previosEnviadosEn).toBeNull();
    // Todavía no llega el día: el trabajo no manda nada.
    await enviarPreviosPendientes(s.ctx());
    expect(previos().length).toBe(antes);
    // Llega el día acordado.
    await s.e.admin.ventasProgramacionCorrida.update({ where: { id: corrida.id }, data: { previosEnviarEn: new Date(`${hoy}T00:00:00Z`) } });
    expect(await enviarPreviosPendientes(s.ctx())).toMatchObject({ enviados: 1 });
    expect(previos().length).toBe(antes + 1);
    expect((await s.e.admin.ventasProgramacionCorrida.findUniqueOrThrow({ where: { id: corrida.id } })).previosEnviadosEn).not.toBeNull();
    expect((await s.e.admin.ventasCierreSeguimiento.findUniqueOrThrow({ where: { documentoId } })).estado).toBe("enviada");
    // Repetir el trabajo no vuelve a mandar.
    await enviarPreviosPendientes(s.ctx());
    expect(previos().length).toBe(antes + 1);
  });

  it("al generar (por defecto) los previos salen el mismo día y quedan marcados como enviados", async () => {
    const antes = previos().length;
    const { documentoId } = await generar({ autoEnvioProforma: true });
    expect(previos().length).toBe(antes + 1);
    const corrida = await s.e.admin.ventasProgramacionCorrida.findFirstOrThrow({ where: { documentoId } });
    expect(corrida.previosEnviadosEn).not.toBeNull();
  });

  it("un día acordado sin día se rechaza y las opciones quedan guardadas y visibles", async () => {
    await expect(s.dato("finanzas.ventas_programacion.crear", base({ autoEnvioProforma: true, previoCuando: "fecha_acordada" }))).rejects.toThrow(/día acordado/);
    const { id } = await generar({ autoEnvioEstadoPago: true, previoCuando: "fecha_acordada", previoDia: 31, esperarOk: true, exigeOc: true });
    const det = await s.dato<{ previoCuando: string; previoDia: number | null; esperarOk: boolean; exigeOc: boolean }>("finanzas.ventas_programacion.obtener", { programacionId: id });
    expect(det).toMatchObject({ previoCuando: "fecha_acordada", previoDia: 31, esperarOk: true, exigeOc: true });
  });

  it("esperar OK apagado informa y no bloquea: el borrador se emite sin el OK del cliente", async () => {
    const { documentoId } = await generar({});
    const seg = await s.e.admin.ventasCierreSeguimiento.findUniqueOrThrow({ where: { documentoId } });
    expect([seg.requiereOk, seg.requiereOcHes]).toEqual([false, false]);
    const tablero = await s.dato<{ items: { documentoId: string; emitible: boolean }[] }>("finanzas.cierre.tablero", { periodo: mesActual });
    expect(tablero.items.find((i) => i.documentoId === documentoId)?.emitible).toBe(true);
    const emitida = await s.dato<{ folio: number }>("finanzas.ventas.emitir", { documentoId });
    expect(emitida.folio).toBeGreaterThan(0);
  });

  it("esperar OK encendido bloquea emitir hasta que el cliente dé su OK; cambiar la programación después no altera el borrador", async () => {
    const { id, documentoId } = await generar({ esperarOk: true });
    expect((await s.e.admin.ventasCierreSeguimiento.findUniqueOrThrow({ where: { documentoId } })).requiereOk).toBe(true);
    await expect(s.dato("finanzas.ventas.emitir", { documentoId })).rejects.toThrow(/Esperando el OK del cliente/);
    await s.dato("finanzas.ventas_programacion.actualizar", { ...base({ esperarOk: false }), programacionId: id });
    await expect(s.dato("finanzas.ventas.emitir", { documentoId })).rejects.toThrow(/Esperando el OK del cliente/);
    await s.dato("finanzas.cierre.actualizar", { documentoId, cambio: { accion: "marcar_ok" } });
    expect((await s.dato<{ folio: number }>("finanzas.ventas.emitir", { documentoId })).folio).toBeGreaterThan(0);
  });

  it("exige OC bloquea emitir hasta tener la orden de compra, aunque el OK esté apagado", async () => {
    const { documentoId } = await generar({ exigeOc: true });
    expect((await s.e.admin.ventasCierreSeguimiento.findUniqueOrThrow({ where: { documentoId } })).requiereOcHes).toBe(true);
    await expect(s.dato("finanzas.ventas.emitir", { documentoId })).rejects.toThrow(/orden de compra/);
    await s.dato("finanzas.cierre.actualizar", { documentoId, cambio: { accion: "registrar_oc_hes", ordenCompra: "4500012345" } });
    expect((await s.dato<{ folio: number }>("finanzas.ventas.emitir", { documentoId })).folio).toBeGreaterThan(0);
  });

  it("el lote del cierre emite lo que nada bloquea y omite lo que espera el OK", async () => {
    const libre = await generar({});
    const espera = await generar({ esperarOk: true });
    const r = await s.dato<{ resultados: { documentoId: string; estado: string }[] }>("finanzas.cierre.emitir_lote", { documentoIds: [libre.documentoId, espera.documentoId] });
    expect(r.resultados.find((x) => x.documentoId === libre.documentoId)?.estado).toBe("emitido");
    expect(r.resultados.find((x) => x.documentoId === espera.documentoId)?.estado).not.toBe("emitido");
  });
});
