// Proforma y estado de pago de una programación, antes de la factura (CAR-221). El día de generación se crea
// el borrador y se manda lo que la programación tenga activado. No son documentos tributarios: no llevan folio
// ni deuda fiscal: salen con su PDF y un número interno (CAR-320). Cada envío queda en el historial del borrador y la
// proforma marca el cierre como «enviada».
import { mesYAnio } from "@opai/domain";

import { hoy } from "../core/maestros/comun";

import { enviarCorreo } from "../core/comunicaciones";
import { correoDe } from "../integraciones/adaptadores";
import type { Contexto } from "../types";
import { cuentaDe } from "./ventas-comun";
import { correosDe, destinosDeDocumento } from "./ventas-destinos";
import { pdfDePrevio } from "./ventas-pdf-previo";

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
  const [cuenta, tenant] = await Promise.all([
    cuentaDe(ctx, b.cuentaId),
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } }),
  ]);
  // Los mismos destinatarios que recibirán la factura (ADR-100): todos los PARA, y la casilla DTE en copia.
  const destinos = await destinosDeDocumento(ctx, { id: b.documentoId, cuentaId: b.cuentaId }, cuenta.emailDte);
  const para = destinos?.para ?? null;
  const correos = destinos ? correosDe(destinos) : [];
  const { mes, anio } = mesYAnio(b.fechaFactura);
  const salida: ResultadoPrevio[] = [];
  for (const tipo of tipos) {
    // El PDF (número interno, sin folio) va adjunto; si no se puede armar, el envío queda fallido y se reintenta.
    const pdf = para
      ? await pdfDePrevio(ctx, tipo, b).catch((e: unknown) => {
          // Solo la categoría del error: nunca datos del cliente ni del documento.
          console.error(`[FINANZAS] PDF de ${tipo} no se pudo armar: ${e instanceof Error ? e.name : "desconocido"}`);
          return null;
        })
      : null;
    const salio = para && pdf
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
          { paraAdicionales: destinos?.paraAdicionales ?? [], cc: destinos?.cc ?? [], bcc: destinos?.bcc ?? [], adjuntos: [{ nombre: pdf.nombre, contenidoBase64: Buffer.from(pdf.bytes).toString("base64"), mime: "application/pdf" }] },
        )
      : false;
    const estado = salio ? ("enviado" as const) : ("fallido" as const);
    const error = salio
      ? null
      : !para
        ? "El borrador no tiene destinatarios."
        : !pdf
          ? "No se pudo armar el PDF del documento."
          : "El correo no salió. Revisa Configuración → Comunicaciones.";
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
