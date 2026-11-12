// Circuito de una programación con datos ficticios (CAR-221): el día de generación crea el borrador y manda la
// proforma y/o el estado de pago (correo SIMULADO capturado en memoria); la factura se proyecta aparte, con
// `diasFacturacion` por encima del momento configurado; cada borrador conserva sus destinatarios; y todo se
// puede seguir hasta la factura emitida (SII simulado) y el cobro en caja. No hay correos ni DTE reales.
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sumarDiasIso } from "@opai/domain";
import type { Correo } from "@opai/integrations";

import { capacidades as capacidadesBancos } from "../../../modules/finanzas/capacidades";
import { urlPropietario } from "../../db/test/entorno";

import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

const hoy = new Date().toISOString().slice(0, 10);
const mesActual = hoy.slice(0, 7);

type Gen = { resultados: { estado: string; fecha: string; fechaFactura: string | null; documentoId: string | null }[] };
type Traza = { estadoDte: string | null; folio: number | null; proformaEstado: string | null; proformaEnviadaEn: string | null; previos: { tipo: string; estado: string }[]; estadoCobro: string | null; montoCobrado: number | null; fechaFactura: string | null };
type Det = { corridas: { periodo: string; documentoId: string | null; traza: Traza | null }[] };

describe.skipIf(!urlPropietario)("programación · circuito proforma / estado de pago → factura → caja", () => {
  let s: VentasDbSuite;
  const enviados: Correo[] = [];
  let c1 = "";
  let c2 = "";

  const base = (extra: Record<string, unknown>) => ({
    nombre: "Servicio con proforma",
    cuentaId: s.cuentaId,
    tipoDte: 33,
    frecuencia: "mensual",
    diaGeneracion: 1,
    plazoPagoDias: 30,
    fechaInicio: `${mesActual}-01`,
    lineas: [{ glosa: "Servicio de guardias", cantidad: "1", precioUnitario: 1_000_000, descuentoPct: 0 }],
    ...extra,
  });
  async function generar(extra: Record<string, unknown>) {
    const p = await s.dato<{ id: string }>("finanzas.ventas_programacion.crear", base(extra));
    await s.dato("finanzas.ventas_programacion.cambiar_estado", { programacionId: p.id, activa: true });
    const g = await s.dato<Gen>("finanzas.ventas_programacion.generar", { programacionId: p.id });
    return { id: p.id, res: g.resultados.find((r) => r.estado === "generado") };
  }

  beforeAll(async () => {
    s = await prepararVentasDb({ correo: { nombre: "simulado", enviar: async (c) => void enviados.push(c) }, urlBase: "https://qa.opai.test" });
    s.mod.registrarCapacidades(capacidadesBancos);
    const contacto = (email: string) =>
      s.e.admin.contacto.create({ data: { tenantId: s.tenantId, cuentaId: s.cuentaId, nombres: "Ana", apellidos: "Ficticia", email, roles: ["facturacion"] } });
    c1 = (await contacto("Pagos@cliente-ficticio.test")).id;
    c2 = (await contacto("contabilidad@cliente-ficticio.test")).id;
  }, 120_000);
  afterAll(async () => {
    await s?.e.cerrar();
  });

  it("el día de generación manda proforma y estado de pago con el asunto con variables, y la factura queda proyectada aparte", async () => {
    const { id, res } = await generar({ diasFacturacion: 15, autoEnvioProforma: true, autoEnvioEstadoPago: true, destinatarioIds: [c1, c2] });
    expect(res?.documentoId).toBeTruthy();
    expect(res?.fechaFactura).toBe(sumarDiasIso(res!.fecha, 15));
    const doc = await s.e.admin.documentoEmitido.findUniqueOrThrow({ where: { id: res!.documentoId! } });
    expect(doc.folio).toBeNull(); // la proforma y el estado de pago no son un DTE
    expect(doc.fechaEmision?.toISOString().slice(0, 10)).toBe(res!.fechaFactura);
    const mios = enviados.filter((c) => /^(Proforma|Estado de pago) - /.test(c.asunto));
    const [proforma, ep] = [mios.find((c) => c.asunto.startsWith("Proforma")), mios.find((c) => c.asunto.startsWith("Estado de pago"))];
    expect(proforma?.asunto).toMatch(/^Proforma - .+ - [A-Za-zé]+ - \d{4}$/);
    expect(ep?.asunto).toMatch(/^Estado de pago - .+ - [A-Za-zé]+ - \d{4}$/);
    expect(proforma?.para).toBe("pagos@cliente-ficticio.test");
    expect(proforma?.cc).toEqual(["contabilidad@cliente-ficticio.test"]);
    // CAR-320: cada correo lleva su PDF con número interno (sin folio del SII), el mismo para ambos tipos del período.
    const [pdfPf, pdfEp] = [proforma?.adjuntos?.[0], ep?.adjuntos?.[0]];
    expect(pdfPf).toMatchObject({ mime: "application/pdf", nombre: expect.stringMatching(/^Proforma PF-\d{4}-\d{2}-\d{4}\.pdf$/) });
    expect(pdfEp?.nombre).toMatch(/^Estado de pago EP-\d{4}-\d{2}-\d{4}\.pdf$/);
    expect(pdfPf?.nombre.slice(12, -4)).toBe(pdfEp?.nombre.slice(18, -4));
    expect(Buffer.from(pdfPf?.contenidoBase64 ?? "", "base64").subarray(0, 5).toString()).toBe("%PDF-");
    const envios = await s.e.admin.documentoEmitidoEnvio.findMany({ where: { documentoId: doc.id }, orderBy: { createdAt: "asc" } });
    expect(envios.map((e) => [e.adjuntos[0], e.estado])).toEqual([["proforma", "enviado"], ["estado_pago", "enviado"]]);
    const seg = await s.e.admin.ventasCierreSeguimiento.findUniqueOrThrow({ where: { documentoId: doc.id } });
    expect(seg.estado).toBe("enviada");
    // Generar de nuevo el mismo período no manda nada más.
    const antes = enviados.length;
    await s.dato("finanzas.ventas_programacion.generar", { programacionId: id });
    expect(enviados.length).toBe(antes);
  });

  it("diasFacturacion prevalece sobre el día fijo y cada flag es independiente", async () => {
    const antes = enviados.length;
    const { res } = await generar({ momentoFactura: "DIA_FIJO", diaFactura: 28, diasFacturacion: 5, autoEnvioProforma: true, destinatarioIds: [c1] });
    expect(res?.fechaFactura).toBe(sumarDiasIso(res!.fecha, 5));
    const nuevos = enviados.slice(antes).map((c) => c.asunto.split(" - ")[0]);
    expect(nuevos).toEqual(["Proforma"]); // el estado de pago no estaba activado
  });

  it("sin flags no se manda nada, y sin destinatarios el envío queda fallido sin detener el borrador", async () => {
    const antes = enviados.length;
    const sinFlags = await generar({ destinatarioIds: [c1] });
    expect(sinFlags.res?.documentoId).toBeTruthy();
    expect(enviados.length).toBe(antes);
    const sinDest = await generar({ autoEnvioProforma: true });
    expect(sinDest.res?.documentoId).toBeTruthy();
    const e = await s.e.admin.documentoEmitidoEnvio.findFirstOrThrow({ where: { documentoId: sinDest.res!.documentoId! } });
    expect([e.estado, e.error]).toEqual(["fallido", "El borrador no tiene destinatarios."]);
    expect(enviados.length).toBe(antes);
  });

  it("cada borrador conserva su lista: cambiar la programación después no altera los ya generados", async () => {
    const { id, res } = await generar({ destinatarioIds: [c1, c2] });
    await s.dato("finanzas.ventas_programacion.actualizar", { ...base({ destinatarioIds: [c2] }), programacionId: id });
    const guardados = await s.e.admin.documentoEmitidoDestinatario.findMany({ where: { documentoId: res!.documentoId! }, orderBy: { orden: "asc" } });
    expect(guardados.map((g) => [g.tipo, g.email])).toEqual([["PARA", "pagos@cliente-ficticio.test"], ["CC", "contabilidad@cliente-ficticio.test"]]);
  });

  it("se sigue hasta la factura emitida y el cobro en caja", async () => {
    const { id, res } = await generar({ autoEnvioProforma: true, destinatarioIds: [c1] });
    const traza = async () => (await s.dato<Det>("finanzas.ventas_programacion.obtener", { programacionId: id })).corridas.find((c) => c.documentoId === res!.documentoId)!.traza!;
    expect(await traza()).toMatchObject({ estadoDte: "borrador", folio: null, proformaEstado: "enviada", previos: [{ tipo: "proforma", estado: "enviado" }] });
    const emitida = await s.dato<{ folio: number; montoTotal: number }>("finanzas.ventas.emitir", { documentoId: res!.documentoId! });
    expect(await traza()).toMatchObject({ estadoDte: "enviado", folio: emitida.folio, estadoCobro: "pendiente", montoCobrado: 0 });
    const pendientes = async () => (await s.dato<{ items: { documentoEmitidoId?: string; monto: number }[] }>("finanzas.ventas.proyeccion_flujo", { semanas: 20 })).items;
    expect((await pendientes()).find((i) => i.documentoEmitidoId === res!.documentoId)?.monto).toBe(emitida.montoTotal);
    const banco = await s.dato<{ id: string }>("finanzas.bancos.guardar", { banco: "Santander", numeroVisible: "5550009" });
    const mov = await s.e.admin.movimientoBancario.create({
      data: { tenantId: s.tenantId, cuentaId: banco.id, fecha: new Date(), monto: BigInt(emitida.montoTotal), glosa: "Transferencia cliente ficticio", claveDedupe: randomUUID(), estado: "pendiente", origen: "cartola" },
    });
    await s.dato("finanzas.conciliaciones.confirmar", { movimientoId: mov.id, enlaces: [{ tipo: "documento_emitido", id: res!.documentoId!, monto: emitida.montoTotal }] });
    expect(await traza()).toMatchObject({ estadoCobro: "pagada", montoCobrado: emitida.montoTotal });
    expect((await pendientes()).some((i) => i.documentoEmitidoId === res!.documentoId)).toBe(false);
  });
});
