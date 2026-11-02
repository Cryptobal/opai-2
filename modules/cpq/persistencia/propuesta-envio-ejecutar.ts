import { reglaDeNegocio, type Contexto } from "@opai/capabilities";

import { normalizarDestinatariosEnvio } from "../domain/documento/propuesta-tecnica";
import { documentoCotizacionEnvioConjunto } from "./propuesta-envio-cotizacion";
import {
  liberarReclamoEnvioPropuesta,
  marcarEnvioPropuestaEnviado,
  reclamarAprobacionEnvioPropuesta,
} from "./propuesta-envio-finalizar";
import { pdfPropuestaDesdeSnapshot } from "./propuesta-envio-pdf-propuesta";
import { cargarContextoEnvioPropuesta } from "./propuesta-envio-contexto";
import {
  eliminarPdfPropuestaAlmacenamiento,
  registrarPdfPropuestaMetadatos,
  subirPdfPropuestaAlmacenamiento,
} from "./registrar-pdf-propuesta";
import {
  construirSnapshotEnvioPropuesta,
  parseSnapshotEnvioPropuesta,
} from "./propuesta-envio-snapshot";
import { enviarCorreosEnvioPropuesta } from "./propuesta-envio-correos";
import type { ResultadoCalculo } from "../domain/motor";

type FilaEnvio = {
  id: string;
  cotizacionId: string;
  versionId: string;
  propuestaTecnicaId: string | null;
  incluyeCotizacion: boolean;
  incluyePropuesta: boolean;
  destinatariosJson: string;
  snapshotJson: string;
  mensaje: string | null;
};

export async function ejecutarEnvioPropuestaAprobado(
  ctx: Contexto,
  row: FilaEnvio,
  input: {
    actorId: string;
    autoaprobacion: boolean;
    envioDirectoDentroMargen?: boolean;
    resultado: ResultadoCalculo;
  },
) {
  const destinatarios = normalizarDestinatariosEnvio(JSON.parse(row.destinatariosJson));
  if (!destinatarios.length) throw reglaDeNegocio("El envío no tiene destinatarios.");

  await reclamarAprobacionEnvioPropuesta(ctx, row.id, input.actorId);

  const snapshot = await construirSnapshotEnvioPropuesta(ctx, {
    cotizacionId: row.cotizacionId,
    propuestaTecnicaId: row.propuestaTecnicaId,
    destinatarios,
  });
  const snapshotJson = JSON.stringify(snapshot);

  const { c, pack, neg, calculoPublico, seccionesVista, servicio } = await cargarContextoEnvioPropuesta(
    ctx,
    row.cotizacionId,
    row.versionId,
    input.resultado,
  );
  const contactoId = destinatarios.find((d) => d.contactoId)?.contactoId ?? null;
  let documentoCotizacionId: string | null = null;
  let documentoPropuestaId: string | null = null;
  let propStorageKey: string | null = null;
  try {
    if (row.incluyeCotizacion) {
      documentoCotizacionId = await documentoCotizacionEnvioConjunto(ctx, {
        snapshot,
        cotizacionId: c.id,
        codigo: c.codigo,
        titulo: c.titulo,
        negocioTitulo: neg.titulo ?? "Negocio",
        negocioId: c.negocioId,
        versionId: pack.version.id,
        versionNumero: pack.version.numero,
        contactoId,
        resultado: input.resultado,
        seccionesVista,
        calculoPublico,
        mensaje: row.mensaje,
        neg,
        emailPreview: destinatarios[0]?.email ?? null,
      });
    }
    if (row.incluyePropuesta) {
      if (!row.propuestaTecnicaId) throw reglaDeNegocio("Falta la propuesta técnica del envío.");
      const pdfPropBytes = await pdfPropuestaDesdeSnapshot(ctx, snapshot, {
        codigo: c.codigo,
        titulo: c.titulo,
        servicio,
        netoTotalClp: calculoPublico.ventaMensual ?? 0,
      });
      const sub = await subirPdfPropuestaAlmacenamiento(ctx, { codigo: `${c.codigo}-propuesta`, pdf: pdfPropBytes });
      propStorageKey = sub.storageKey;
      await ctx.transaccion(async (tx) => {
        documentoPropuestaId = await registrarPdfPropuestaMetadatos(ctx, tx, {
          ...sub,
          cotizacionId: c.id,
          codigo: c.codigo,
        });
      });
    }
    if (row.incluyeCotizacion && !documentoCotizacionId) throw reglaDeNegocio("No se generó el PDF de cotización.");
    if (row.incluyePropuesta && !documentoPropuestaId) {
      throw reglaDeNegocio("No se generó el PDF de propuesta técnica.");
    }
    await marcarEnvioPropuestaEnviado(ctx, {
      envioId: row.id,
      cotizacionId: c.id,
      actorId: input.actorId,
      autoaprobacion: input.autoaprobacion,
      incluyeCotizacion: row.incluyeCotizacion,
      incluyePropuesta: row.incluyePropuesta,
      propuestaTecnicaId: row.propuestaTecnicaId,
      documentoCotizacionId,
      documentoPropuestaId,
      destinatarios: destinatarios.length,
      snapshotJson,
      envioDirectoDentroMargen: input.envioDirectoDentroMargen ?? false,
    });
  } catch (e) {
    await liberarReclamoEnvioPropuesta(ctx, row.id, input.actorId);
    if (propStorageKey) await eliminarPdfPropuestaAlmacenamiento(ctx, propStorageKey);
    throw e;
  }
  await enviarCorreosEnvioPropuesta(ctx, destinatarios, {
    codigo: c.codigo,
    titulo: c.titulo,
    negocio: neg.titulo ?? "",
    ventaMensual: calculoPublico.ventaMensual,
    mensaje: row.mensaje ?? "",
  });
  return { documentoCotizacionId, documentoPropuestaId, snapshot: parseSnapshotEnvioPropuesta(snapshotJson) };
}
