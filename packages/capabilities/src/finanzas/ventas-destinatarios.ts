import { z } from "zod";

import {
  ORIGENES_DESTINATARIO,
  TIPOS_DESTINATARIO,
  agruparDestinatarios,
  destinatariosSugeridos,
  correoNormalizado,
  validarDestinatarios,
  type DestinatarioDoc,
} from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { escribirConEvento } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { PERMISO_VENTAS, cuentaDe, documentoEmitidoIdSchema } from "./ventas-comun";

const destinatarioSchema = z.object({
  tipo: z.enum(TIPOS_DESTINATARIO),
  email: z.string().trim().min(3).max(254),
  origen: z.enum(ORIGENES_DESTINATARIO).default("manual"),
});

const destinatarioSalidaSchema = z.object({
  tipo: z.enum(TIPOS_DESTINATARIO),
  email: z.string(),
  origen: z.enum(ORIGENES_DESTINATARIO),
});

/** Contactos de facturación activos de una cuenta, con el principal primero (mismo criterio que el envío). */
async function contactosFacturacion(ctx: Parameters<typeof cuentaDe>[0], cuentaId: string) {
  return ctx.db.contacto.findMany({
    where: {
      cuentaId,
      estado: "activo",
      archivadoEn: null,
      anonimizadoEn: null,
      email: { not: null },
      roles: { has: "facturacion" },
    },
    select: { id: true, email: true, esPrincipal: true },
    orderBy: [{ esPrincipal: "desc" }, { createdAt: "asc" }],
  });
}

async function guardadosDe(ctx: Parameters<typeof cuentaDe>[0], documentoId: string): Promise<DestinatarioDoc[]> {
  const filas = await ctx.db.documentoEmitidoDestinatario.findMany({
    where: { documentoId },
    orderBy: { orden: "asc" },
  });
  return filas.map((f) => ({
    tipo: f.tipo as DestinatarioDoc["tipo"],
    email: f.email,
    origen: f.origen as DestinatarioDoc["origen"],
  }));
}

export const ventasDestinatariosSugeridos = defineCapability({
  id: "finanzas.ventas.destinatarios_sugeridos",
  descripcion:
    "Propone los destinatarios del correo de un documento de venta a partir de la cuenta del cliente: la casilla DTE de la cuenta como destinatario principal y los contactos con rol facturación en copia. Si se indica el documento, devuelve además los destinatarios ya guardados en él.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    cuentaId: uuidSchema,
    documentoId: documentoEmitidoIdSchema.optional().describe("Documento del que se quieren ver los destinatarios guardados."),
  }),
  output: z.object({
    cuentaId: z.string(),
    sugeridos: z.array(destinatarioSalidaSchema),
    guardados: z.array(destinatarioSalidaSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [s.cuentaId],
  async handler(ctx, input) {
    const cuenta = await cuentaDe(ctx, input.cuentaId);
    const contactos = await contactosFacturacion(ctx, cuenta.id);
    let guardados: DestinatarioDoc[] = [];
    if (input.documentoId) {
      const doc = await ctx.db.documentoEmitido.findFirst({
        where: { id: input.documentoId },
        select: { id: true, cuentaId: true },
      });
      if (!doc || doc.cuentaId !== cuenta.id) throw noEncontrado("El documento");
      guardados = await guardadosDe(ctx, doc.id);
    }
    return {
      cuentaId: cuenta.id,
      sugeridos: destinatariosSugeridos({
        emailDte: cuenta.emailDte,
        contactosFacturacion: contactos.map((c) => ({ email: c.email, esPrincipal: c.esPrincipal })),
      }),
      guardados,
    };
  },
});

export const ventasGuardarDestinatarios = defineCapability({
  id: "finanzas.ventas.guardar_destinatarios",
  descripcion:
    "Guarda los destinatarios del correo de un documento de venta: exactamente uno PARA y el resto en copia (CC) o copia oculta (BCC), hasta 20 en total, sin correos repetidos. Reemplaza la lista anterior del documento. El envío al cliente usa esta lista; si no hay ninguna, usa los contactos de facturación.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    documentoId: documentoEmitidoIdSchema,
    destinatarios: z.array(destinatarioSchema).min(1).max(20),
  }),
  output: z.object({
    documentoId: z.string(),
    para: z.string(),
    cc: z.array(z.string()),
    bcc: z.array(z.string()),
    destinatarios: z.array(destinatarioSalidaSchema),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const doc = await ctx.db.documentoEmitido.findFirst({ where: { id: input.documentoId }, select: { id: true } });
    if (!doc) throw noEncontrado("El documento");
    const lista: DestinatarioDoc[] = input.destinatarios.map((d) => ({
      tipo: d.tipo,
      email: correoNormalizado(d.email),
      origen: d.origen,
    }));
    const error = validarDestinatarios(lista);
    if (error) throw reglaDeNegocio(error);
    const agrupado = agruparDestinatarios(lista);
    const salida = { documentoId: doc.id, ...agrupado, destinatarios: lista };
    if (dryRun) return salida;
    await escribirConEvento(
      ctx,
      {
        tipo: "finanzas.venta.destinatarios_guardados",
        entidadTipo: "documento_emitido",
        payload: () => ({ destinatarios: lista.length, copias: agrupado.cc.length, ocultas: agrupado.bcc.length }),
      },
      async (tx) => {
        await tx.documentoEmitidoDestinatario.deleteMany({ where: { documentoId: doc.id } });
        await tx.documentoEmitidoDestinatario.createMany({
          data: lista.map((d, orden) => ({
            tenantId: ctx.tenantId,
            documentoId: doc.id,
            orden,
            tipo: d.tipo,
            email: d.email,
            origen: d.origen,
          })),
        });
        return { id: doc.id };
      },
    );
    return salida;
  },
});
