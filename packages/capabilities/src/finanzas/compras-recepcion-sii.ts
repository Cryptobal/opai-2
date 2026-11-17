// Aceptar o reclamar un DTE recibido ante el SII (CAR-644). Paridad OPAI 1.0 + SimpleAPI compras/aceptacionreclamo.
import { z } from "zod";

import { diasParaReclamo } from "@opai/domain";
import { aceptarConAcuse, acuseRecibido } from "@opai/integrations";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { dia, escribirConEvento, hoy } from "../core/maestros/comun";
import { consumoBase } from "../integraciones/consumo-base";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { credencialesSimpleApi } from "./adaptador-sii";
import { vistasDeCompras } from "./compras-consulta";
import {
  ACCIONES_RECEPCION_UI,
  accionesSiiDe,
  estadoTrasAccion,
  salidaRecepcionSii,
  textoAprobacionRecepcion,
  type AccionRecepcionUi,
} from "./compras-recepcion-acciones";
import { PERMISO_COMPRAS } from "./comun";
import { ambienteDe } from "./ventas-comun";

async function vistaCompra(ctx: Parameters<typeof vistasDeCompras>[0], id: string) {
  const fila = await ctx.db.documentoRecibido.findFirst({ where: { id }, include: { proveedor: true } });
  if (!fila) throw noEncontrado("El documento");
  const [vista] = await vistasDeCompras(ctx, [fila]);
  if (!vista) throw noEncontrado("El documento");
  return vista;
}

const medirAcuse = (ctx: Parameters<typeof consumoBase>[0], cantidad: number, ok: boolean) =>
  ctx.medidor?.registrar({ ...consumoBase(ctx, "finanzas"), recurso: "sii.acuse_compra", unidad: "accion", cantidad, yaIncurrido: ok });

export const comprasRecepcionSii = defineCapability({
  id: "finanzas.compras.recepcion_sii",
  descripcion:
    "Notifica al SII la aceptación o el reclamo de un documento del libro de compras (Registro de Aceptación o Reclamo). Irreversible: con vista previa. Requiere Emisión DTE con SimpleAPI y certificado.",
  permiso: PERMISO_COMPRAS,
  input: z.object({
    documentoId: uuidSchema,
    accion: z.enum(ACCIONES_RECEPCION_UI),
    motivo: z.string().max(500).optional().describe("Texto opcional de auditoría; no viaja al SII."),
  }),
  output: salidaRecepcionSii,
  efecto: "irreversible",
  dryRun: true,
  exigeAprobacion: () => true,
  describirAprobacion: async (ctx, input) => {
    const doc = await ctx.db.documentoRecibido.findFirst({
      where: { id: input.documentoId },
      include: { proveedor: { select: { razonSocial: true } } },
    });
    if (!doc) return null;
    return textoAprobacionRecepcion(input.accion as AccionRecepcionUi, doc.tipoDte, doc.folio, doc.proveedor.razonSocial);
  },
  async handler(ctx, input, { dryRun }) {
    const doc = await ctx.db.documentoRecibido.findFirst({
      where: { id: input.documentoId },
      include: { proveedor: { select: { rut: true, razonSocial: true } } },
    });
    if (!doc) throw noEncontrado("El documento");
    if (doc.estadoRecepcion !== "pendiente_revision") {
      throw reglaDeNegocio("Solo se puede acusar un documento pendiente de revisión ante el SII.");
    }
    const recepcion = dia(doc.fechaRecepcion) ?? hoy();
    const fueraDePlazo = diasParaReclamo(recepcion, hoy()) < 0;
    const accionesSii = accionesSiiDe(input.accion);
    const base = {
      accion: input.accion,
      accionesSii,
      estadoNuevo: estadoTrasAccion(input.accion),
      fueraDePlazo,
      ...(fueraDePlazo ? { aviso: "El plazo legal de 8 días ya venció; el SII puede rechazar la acción." } : {}),
    };
    if (dryRun) return salidaRecepcionSii.parse({ ...base, compra: await vistaCompra(ctx, doc.id) });

    const creds = await credencialesSimpleApi(ctx);
    if (!creds) throw reglaDeNegocio("Falta configurar Emisión DTE (API key de SimpleAPI y certificado) para acusar al SII.");
    const ambiente = await ambienteDe(ctx);
    const pedido = { tipoDte: doc.tipoDte, folio: doc.folio, rutProveedor: doc.proveedor.rut };
    let trackId: string | undefined;
    let aviso = base.aviso;
    if (input.accion === "aceptar") {
      const r = await aceptarConAcuse(creds, pedido, ambiente);
      await medirAcuse(ctx, 2, r.ok);
      if (!r.ok) throw reglaDeNegocio(r.motivo);
      trackId = r.trackId;
      if (r.ermOk === false && r.motivo) aviso = (aviso ? `${aviso} ` : "") + r.motivo;
    } else {
      const accion = accionesSii[0];
      if (!accion) throw reglaDeNegocio("Acción de recepción inválida.");
      const r = await acuseRecibido(creds, { ...pedido, accion }, ambiente);
      await medirAcuse(ctx, 1, r.ok);
      if (!r.ok) throw reglaDeNegocio(r.incierto ? `${r.motivo} El estado en OPAI no cambió; verifique en el SII antes de reintentar.` : r.motivo);
      trackId = r.trackId;
    }

    await escribirConEvento(
      ctx,
      {
        tipo: "finanzas.compras.recepcion_sii",
        entidadTipo: "documento_recibido",
        payload: () => ({ documentoId: doc.id, accion: input.accion, accionesSii, trackId, fueraDePlazo, motivo: input.motivo ?? null }),
      },
      async (tx) => {
        await tx.documentoRecibido.update({ where: { id: doc.id }, data: { estadoRecepcion: estadoTrasAccion(input.accion) } });
        return { id: doc.id };
      },
    );
    return salidaRecepcionSii.parse({
      ...base,
      trackId,
      ...(aviso ? { aviso } : {}),
      compra: await vistaCompra(ctx, doc.id),
    });
  },
});