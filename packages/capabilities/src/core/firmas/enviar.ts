import { z } from "zod";

import { enviarRequiereAprobacion, plazoVence, type ClaseFirma, type NivelFirma } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { documentosEnAlcance } from "../documentos/alcance-doc";
import { filtroDocumentoSensible } from "../documentos/sensibles";
import { uuidSchema } from "../esquemas";
import {
  claseSchema,
  nivelDisponibleSchema,
  ordenSchema,
  PLAZO_MAX,
  politicaEfectiva,
} from "./comun";
import { PERMISO_FIRMAS_ENVIAR, registrarEvidencia } from "./comun-flujo";
import {
  construirFirmantes,
  firmanteInputSchema,
  validarFirmantes,
  validarNivelEnvio,
  vistaPreview,
} from "./enviar-util";
import { solicitudVistaSchema, vistaSolicitud } from "./vistas";

const ACTAS = new Set(["acta", "acta_reunion"]);

export const firmasEnviar = defineCapability({
  id: "core.firmas.enviar",
  descripcion:
    "Congela un documento (huella SHA-256, R4) y lo envía a firma con firmantes, orden, nivel y plazo. Un agente lo envía con aprobación humana, salvo los envíos N1 de actas y recepciones (firma.md R19, P12).",
  permiso: PERMISO_FIRMAS_ENVIAR,
  portales: ["erp", "supervisor"],
  input: z.object({
    documentoId: uuidSchema,
    clase: claseSchema,
    nivel: nivelDisponibleSchema,
    orden: ordenSchema.optional(),
    plazoDias: z.number().int().min(1).max(PLAZO_MAX).optional(),
    mensaje: z.string().trim().max(500).optional(),
    firmantes: z.array(firmanteInputSchema).min(1).max(20),
  }),
  output: solicitudVistaSchema,
  efecto: "irreversible",
  dryRun: true,
  // R19/P12: toda N2/N3 y las clases fuera de actas y recepciones piden aprobación a un agente.
  exigeAprobacion: (input) =>
    enviarRequiereAprobacion(input.clase as ClaseFirma, input.nivel as NivelFirma),
  async handler(ctx, input, { dryRun }) {
    // El supervisor solo envía actas a firma (firma.md §8); su alcance por instalación va abajo.
    if (ctx.rol === "supervisor" && !ACTAS.has(input.clase))
      throw reglaDeNegocio("El supervisor solo envía actas a firma (§8).");
    const permitidos = await documentosEnAlcance(ctx);
    const doc = await ctx.db.documento.findFirst({
      where: {
        ...filtroDocumentoSensible(ctx),
        id: input.documentoId,
        ...(permitidos
          ? { id: { in: [...permitidos].filter((id) => id === input.documentoId) } }
          : {}),
      },
    });
    if (!doc) throw noEncontrado("El documento");
    if (doc.estado !== "disponible" || !doc.sha256)
      throw reglaDeNegocio("Solo se envía a firma un documento disponible con su huella.");
    const fila = await ctx.db.politicaFirma.findUnique({
      where: { tenantId_clase: { tenantId: ctx.tenantId, clase: input.clase } },
    });
    const pol = politicaEfectiva(input.clase as ClaseFirma, fila);
    validarNivelEnvio(input.clase as ClaseFirma, input.nivel as NivelFirma, pol);
    validarFirmantes(input.firmantes);
    const orden = input.orden ?? pol.orden;
    const vence = plazoVence(new Date(), input.plazoDias ?? pol.plazoDias);
    const base = {
      documentoId: doc.id,
      documentoVersion: doc.version,
      sha256: doc.sha256,
      clase: input.clase,
      nivel: input.nivel,
      orden,
      mensaje: input.mensaje ?? null,
      plazoVence: vence,
    };
    if (dryRun) return vistaPreview(base, input.firmantes);
    const firmantes = construirFirmantes(ctx.tenantId, input.firmantes, vence);
    const creada = await ctx.transaccion(async (tx) => {
      const s = await tx.solicitudFirma.create({
        data: {
          tenantId: ctx.tenantId,
          ...base,
          estado: "enviada",
          enviadaPorTipo: ctx.actor.tipo,
          enviadaPorId: ctx.actor.tipo === "user" ? ctx.actor.id : null,
          viaUserId: ctx.actor.viaUserId ?? null,
        },
      });
      for (const f of firmantes)
        await tx.firmante.create({ data: { ...f.row, solicitudId: s.id } });
      const hecho = await registrarEvidencia(ctx, tx, s, {
        tipo: "enviada",
        nivel: input.nivel,
        sha256: doc.sha256,
      });
      await tx.solicitudFirma.update({ where: { id: s.id }, data: { bitacoraSeq: hecho.seq } });
      await ctx.eventos.emitir(tx, {
        tipo: "documentos.firma.solicitada",
        entidadTipo: "solicitud_firma",
        entidadId: s.id,
        payload: { clase: input.clase, nivel: input.nivel, orden, pendientes: firmantes.length },
      });
      return tx.solicitudFirma.findUniqueOrThrow({
        where: { id: s.id },
        include: { firmantes: true },
      });
    });
    return vistaSolicitud(creada);
  },
});
