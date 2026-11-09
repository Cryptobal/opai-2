// Proforma y estado de pago de una programación, antes de la factura (CAR-221). El día de generación se crea
// el borrador y se manda lo que la programación tenga activado. No son documentos tributarios: no llevan folio
// ni deuda fiscal. Cada envío queda en el historial del borrador y la proforma marca el cierre como «enviada».
import { mesYAnio } from "@opai/domain";

import { hoy } from "../core/maestros/comun";

import { enviarCorreo } from "../core/comunicaciones";
import { correoDe } from "../integraciones/adaptadores";
import type { Contexto } from "../types";
import { cuentaDe } from "./ventas-comun";

export type TipoPrevio = "proforma" | "estado_pago";
export type ResultadoPrevio = { tipo: TipoPrevio; estado: "enviado" | "fallido"; destinatarios: string[] };

const EVENTO: Record<TipoPrevio, string> = {
  proforma: "finanzas.venta.proforma_enviada",
  estado_pago: "finanzas.venta.estado_pago_enviado",
};
const clp = (n: number) => `$${new Intl.NumberFormat("es-CL").format(n)}`;
const dmy = (iso: string) => iso.split("-").reverse().join("-");

type Borrador = { documentoId: string; cuentaId: string; fechaFactura: string; montoTotal: number };
type Flags = { autoEnvioProforma: boolean; autoEnvioEstadoPago: boolean };

/** Manda la proforma y/o el estado de pago activados. Un fallo de correo no detiene la generación. */
export async function enviarPrevios(ctx: Contexto, flags: Flags, b: Borrador): Promise<ResultadoPrevio[]> {
  const tipos: TipoPrevio[] = [
    ...(flags.autoEnvioProforma ? (["proforma"] as const) : []),
    ...(flags.autoEnvioEstadoPago ? (["estado_pago"] as const) : []),
  ];
  if (!tipos.length) return [];
  const guardados = await ctx.db.documentoEmitidoDestinatario.findMany({
    where: { documentoId: b.documentoId },
    orderBy: { orden: "asc" },
  });
  const [cuenta, tenant] = await Promise.all([
    cuentaDe(ctx, b.cuentaId),
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } }),
  ]);
  const para = guardados.find((g) => g.tipo === "PARA")?.email ?? null;
  const resto = guardados.filter((g) => g.email !== para);
  const cc = resto.filter((g) => g.tipo === "CC").map((g) => g.email);
  const bcc = resto.filter((g) => g.tipo === "BCC").map((g) => g.email);
  const correos = para ? [para, ...cc, ...bcc] : [];
  const { mes, anio } = mesYAnio(b.fechaFactura);
  const salida: ResultadoPrevio[] = [];
  for (const tipo of tipos) {
    const salio = para
      ? await enviarCorreo(
          { db: ctx.db, tenantId: ctx.tenantId, correo: await correoDe(ctx), urlBase: ctx.servicios.urlBase },
          EVENTO[tipo],
          para,
          {
            cliente: { nombre: cuenta.nombre },
            periodo: { mes, anio },
            documento: { total: clp(b.montoTotal), fecha_factura: dmy(b.fechaFactura) },
            empresa: { nombre: tenant?.nombre ?? "" },
          },
          { cc, bcc },
        )
      : false;
    const estado = salio ? ("enviado" as const) : ("fallido" as const);
    const error = salio ? null : para ? "El correo no salió. Revisa Configuración → Comunicaciones." : "El borrador no tiene destinatarios.";
    await ctx.transaccion(async (tx) => {
      await tx.documentoEmitidoEnvio.create({
        data: { tenantId: ctx.tenantId, documentoId: b.documentoId, destinatarios: correos, adjuntos: [tipo], estado, error },
      });
      if (tipo === "proforma" && salio) {
        const marca = { estado: "enviada", enviadaEn: new Date() };
        await tx.ventasCierreSeguimiento.upsert({
          where: { documentoId: b.documentoId },
          create: { tenantId: ctx.tenantId, documentoId: b.documentoId, ...marca },
          update: marca,
        });
      }
      await ctx.eventos.emitir(tx, {
        tipo: EVENTO[tipo],
        entidadTipo: "documento_emitido",
        entidadId: b.documentoId,
        payload: { estado, destinatarios: correos.length },
      });
    });
    salida.push({ tipo, estado, destinatarios: correos });
  }
  return salida;
}

const DIAS_REINTENTO = 7;

/**
 * Trabajo diario: manda los previos cuyo día acordado ya llegó y todavía no salieron completos. Un correo caído o un borrador
 * sin destinatarios se reintenta cada día durante una semana desde el día acordado; después queda en el historial como fallido.
 */
export async function enviarPreviosPendientes(ctx: Contexto): Promise<{ revisados: number; enviados: number }> {
  const h = hoy();
  const desde = new Date(`${h}T00:00:00Z`);
  desde.setUTCDate(desde.getUTCDate() - DIAS_REINTENTO);
  const pendientes = await ctx.db.ventasProgramacionCorrida.findMany({
    where: { previosEnviadosEn: null, previosEnviarEn: { gte: desde, lte: new Date(`${h}T00:00:00Z`) }, documentoId: { not: null } },
    select: {
      id: true,
      documentoId: true,
      programacion: { select: { autoEnvioProforma: true, autoEnvioEstadoPago: true, cuentaId: true } },
      documento: { select: { estadoDte: true, fechaEmision: true, montoTotal: true } },
    },
    orderBy: { previosEnviarEn: "asc" },
    take: 200,
  });
  let enviados = 0;
  for (const c of pendientes) {
    if (!c.documento?.fechaEmision || !c.documentoId) continue;
    // Un documento ya emitido o descartado no recibe una proforma: se da por cerrado.
    if (c.documento.estadoDte !== "borrador" || !c.programacion.cuentaId) {
      await ctx.db.ventasProgramacionCorrida.update({ where: { id: c.id }, data: { previosEnviadosEn: new Date() } });
      continue;
    }
    const resultado = await enviarPrevios(ctx, c.programacion, {
      documentoId: c.documentoId,
      cuentaId: c.programacion.cuentaId,
      fechaFactura: c.documento.fechaEmision.toISOString().slice(0, 10),
      montoTotal: c.documento.montoTotal,
    });
    if (resultado.every((r) => r.estado === "enviado")) {
      await ctx.db.ventasProgramacionCorrida.update({ where: { id: c.id }, data: { previosEnviadosEn: new Date() } });
      enviados += resultado.length;
    }
  }
  return { revisados: pendientes.length, enviados };
}
