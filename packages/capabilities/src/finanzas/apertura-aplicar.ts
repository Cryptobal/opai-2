// Aplica la apertura (BRIEF-30): saldos de banco, facturas por cobrar y último folio. Todo en una
// corrida de `core.importaciones` para poder conciliar y revertir. Nunca pisa lo que ya existe.
import { diferenciasControl, normalizarRut, sumasControl, validarApertura } from "@opai/domain";
import type { DocumentoApertura, EntradaApertura, Rechazo } from "@opai/domain";

import type { Contexto } from "../types";
import type { ResultadoApertura } from "./apertura-datos";

const aFecha = (d: string) => new Date(`${d}T00:00:00.000Z`);
const estadoCobro = (d: DocumentoApertura) =>
  d.montoCobrado >= d.montoTotal && d.montoTotal > 0 ? "pagada" : d.montoCobrado > 0 ? "pagada_parcial" : "pendiente";

export async function aplicarApertura(
  ctx: Contexto,
  fechaCorte: string,
  bruta: EntradaApertura,
  dryRun: boolean,
): Promise<ResultadoApertura> {
  const { validas, rechazos: r0 } = validarApertura(bruta);
  const rechazos: Rechazo[] = [...r0];
  const [cuentas, existentes, bancos, folios, conApertura] = await Promise.all([
    ctx.db.cuenta.findMany({ where: { rut: { not: null } }, select: { id: true, rut: true } }),
    ctx.db.documentoEmitido.findMany({ where: { folio: { not: null } }, select: { tipoDte: true, folio: true } }),
    ctx.db.cuentaBancaria.findMany({ select: { id: true, banco: true, numeroVisible: true } }),
    ctx.db.dteFolio.findMany({ where: { activo: true }, select: { id: true, tipoDte: true, folioActual: true, folioHasta: true } }),
    ctx.db.movimientoBancario.findMany({ where: { origen: "manual" }, select: { cuentaId: true } }),
  ]);
  const cuentasConApertura = new Set(conApertura.map((m) => m.cuentaId));
  const cuentaPorRut = new Map(cuentas.map((c) => [normalizarRut(c.rut ?? "") ?? "", c.id]));
  const hay = new Set(existentes.map((d) => `${d.tipoDte}-${d.folio}`));
  const bancoPor = new Map(bancos.map((b) => [`${b.banco}/${b.numeroVisible}`, b.id]));

  const docs: { d: DocumentoApertura; cuentaId: string }[] = [];
  let sinCambio = 0;
  for (const d of validas.documentos) {
    const clave = `${d.tipoDte}-${d.folio}`;
    const cuentaId = cuentaPorRut.get(normalizarRut(d.rutReceptor) ?? "\0");
    if (hay.has(clave)) sinCambio += 1;
    else if (!cuentaId) rechazos.push({ entidad: "documento", clave, motivo: "el RUT no corresponde a ninguna cuenta de 2.0" });
    else docs.push({ d, cuentaId });
  }
  const saldosConocidos: typeof validas.saldos = [];
  const saldos = validas.saldos.filter((s) => {
    const idCuenta = bancoPor.get(`${s.banco}/${s.numeroVisible}`);
    const ok = idCuenta !== undefined;
    if (ok) saldosConocidos.push(s);
    if (ok && cuentasConApertura.has(idCuenta)) {
      sinCambio += 1;
      return false;
    }
    if (!ok) rechazos.push({ entidad: "saldo", clave: `${s.banco}/${s.numeroVisible}`, motivo: "la cuenta bancaria no existe en 2.0" });
    return ok;
  });
  const foliosAplicar = validas.folios.flatMap((f) => {
    const fila = folios.find((x) => x.tipoDte === f.tipoDte && x.folioActual <= f.ultimoFolio);
    if (!fila) return [];
    return [{ fila, proximo: f.ultimoFolio + 1 }];
  });

  const aceptada: EntradaApertura = {
    saldos: saldosConocidos,
    documentos: [...docs.map((x) => x.d), ...validas.documentos.filter((d) => hay.has(`${d.tipoDte}-${d.folio}`))],
    folios: validas.folios,
  };
  const origen = sumasControl(bruta);
  const destino = sumasControl(aceptada);
  const creados = { saldos: saldos.length, documentos: docs.length, folios: foliosAplicar.length };
  const salida = (importacionId: string | null): ResultadoApertura => ({
    importacionId, creados, sinCambio, rechazos, origen, destino,
    diferencias: diferenciasControl(origen, destino),
  });
  if (dryRun) return salida(null);

  const id = await ctx.transaccion(async (tx) => {
    const corrida = await tx.importacion.create({
      data: { tenantId: ctx.tenantId, origen: "instantanea", versionContrato: "finanzas-apertura@1", modo: "aplicar", lanzadaPorId: ctx.usuario?.id ?? null },
      select: { id: true },
    });
    const fila = (entidad: string, id10: string, id20: string, previos?: Record<string, number>) =>
      tx.importacionFila.create({ data: { tenantId: ctx.tenantId, importacionId: corrida.id, entidad, id10, id20, accion: "creado", ...(previos ? { previos } : {}) } });
    for (const s of saldos) {
      const cuentaId = bancoPor.get(`${s.banco}/${s.numeroVisible}`) as string;
      const m = await tx.movimientoBancario.create({
        data: {
          tenantId: ctx.tenantId, cuentaId, fecha: aFecha(fechaCorte), monto: BigInt(s.saldo), glosa: "Saldo de apertura desde OPAI 1.0",
          saldoDespues: BigInt(s.saldo), claveDedupe: `apertura:${corrida.id}`, estado: "ignorado", origen: "manual",
        },
      });
      await fila("saldo_banco", `${s.banco}/${s.numeroVisible}`, m.id);
    }
    for (const { d, cuentaId } of docs) {
      const doc = await tx.documentoEmitido.create({
        data: {
          tenantId: ctx.tenantId, cuentaId, tipoDte: d.tipoDte, folio: d.folio, fechaEmision: aFecha(d.fechaEmision),
          fechaVencimiento: d.fechaVencimiento ? aFecha(d.fechaVencimiento) : null, montoNeto: d.montoNeto, montoExento: d.montoExento,
          montoIva: d.montoIva, montoTotal: d.montoTotal, estadoDte: "aceptado", estadoCobro: estadoCobro(d), montoCobrado: d.montoCobrado,
          glosa: d.glosa ?? "Documento de apertura desde OPAI 1.0",
        },
      });
      await fila("documento_cobrar", `${d.tipoDte}-${d.folio}`, doc.id);
    }
    for (const { fila: f, proximo } of foliosAplicar) {
      await tx.dteFolio.update({ where: { id: f.id }, data: { folioActual: Math.min(proximo, f.folioHasta + 1) } });
      await fila("folio", String(f.tipoDte), f.id, { folioActual: f.folioActual });
    }
    await tx.importacion.update({
      where: { id: corrida.id },
      data: { estado: "completada", terminadaEn: new Date(), conteos: { apertura: { ...creados, sinCambio, porCobrar: destino.porCobrar } } },
    });
    return corrida.id;
  });
  return salida(id);
}

