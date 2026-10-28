import { documentosEnAlcance } from "./alcance-doc";
import { z } from "zod";

import {
  claveDocumento,
  esSha256,
  mimePermitido,
  nombreSeguro,
  PERMISOS_CORE,
  TAMANO_MAXIMO_DOCUMENTO,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { aFecha, diaSchema, hoy, textoOpcional } from "../maestros/comun";
import { ajuste } from "../config/valores";
import { documentoAReemplazar, tipoParaEntidad, verificarEntidad } from "./entidad";
import { uuid7 } from "./uuid7";
import { documentoSchema, entidadSchema, vistaDocumento } from "./vista";

const VIGENCIA_SUBIDA_S = 600;

export const documentosIniciarSubida = defineCapability({
  id: "core.documentos.iniciar_subida",
  descripcion:
    "Primer paso para subir un documento: valida tipo, tamaño (ajuste de la empresa, hasta 25 MB) y formato, crea el documento pendiente y entrega una URL PUT firmada por 10 minutos con las cabeceras a enviar (incluye la huella SHA-256 declarada). Luego llama a core.documentos.confirmar_subida.",
  permiso: PERMISOS_CORE.documentosManage,
  portales: ["erp", "supervisor"],
  input: z.object({
    entidad: entidadSchema,
    tipoId: uuidSchema.optional(),
    nombre: z.string().trim().min(1).max(255).describe("Nombre del archivo."),
    mime: z.string().trim().toLowerCase().max(120),
    tamano: z.number().int().min(1).describe("Bytes."),
    sha256: z.string().trim().toLowerCase().refine(esSha256, "SHA-256 en hex (64 caracteres)."),
    titulo: textoOpcional(200),
    emitidoEn: diaSchema.optional(),
    venceEn: diaSchema.optional(),
    reemplazaAId: uuidSchema.optional().describe("Documento del que esta es una nueva versión."),
  }),
  output: z.object({
    documento: documentoSchema,
    subida: z
      .object({
        url: z.string(),
        metodo: z.literal("PUT"),
        cabeceras: z.record(z.string(), z.string()),
        expiraEn: z.string(),
      })
      .nullable(),
    duplicados: z
      .array(z.object({ id: z.string(), nombre: z.string() }))
      .describe("Documentos con la misma huella (se permite)."),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await verificarEntidad(ctx, input.entidad);
    const anterior = input.reemplazaAId
      ? await documentoAReemplazar(ctx, input.reemplazaAId, input.entidad)
      : null;
    const tipo = await tipoParaEntidad(
      ctx,
      input.tipoId ?? anterior?.tipoId ?? undefined,
      input.entidad,
    );
    if (!mimePermitido(input.mime, tipo?.mimesPermitidos ?? []))
      throw reglaDeNegocio(`Formato no permitido: ${input.mime}.`);
    const maximoMb = await ajuste<number>(ctx, "core", "documentos_tamano_maximo_mb");
    if (input.tamano > Math.min(maximoMb * 1_048_576, TAMANO_MAXIMO_DOCUMENTO)) {
      throw reglaDeNegocio(`El archivo supera ${maximoMb} MB.`);
    }
    if (tipo?.tieneVencimiento && !input.venceEn)
      throw reglaDeNegocio(`"${tipo.nombre}" exige fecha de vencimiento.`);
    if (!dryRun && !ctx.servicios.almacenamiento.disponible)
      throw reglaDeNegocio("El almacenamiento no está configurado en este entorno.");
    const permitidos = await documentosEnAlcance(ctx);
    const duplicados = (
      await ctx.db.documento.findMany({
        where: {
          sha256: input.sha256,
          estado: "disponible",
          ...(permitidos ? { id: { in: [...permitidos] } } : {}),
        },
        take: 5,
      })
    ).map((d) => ({ id: d.id, nombre: d.nombre }));
    const id = uuid7();
    const version = (anterior?.version ?? 0) + 1;
    const nombre = nombreSeguro(input.nombre);
    const data = {
      id,
      tipoId: tipo?.id ?? null,
      nombre,
      titulo: input.titulo ?? null,
      mime: input.mime,
      tamano: input.tamano,
      sha256: input.sha256,
      storageKey: claveDocumento(ctx.tenantId, id, version, nombre),
      estado: "pendiente",
      version,
      reemplazaAId: anterior?.id ?? null,
      emitidoEn: input.emitidoEn ? aFecha(input.emitidoEn) : null,
      venceEn: input.venceEn ? aFecha(input.venceEn) : null,
      visibleEn: tipo?.visiblePortalDefault ?? [],
      creadoPorTipo: ctx.actor.tipo,
      creadoPorId: ctx.actor.id ?? null,
      viaUserId: ctx.actor.viaUserId ?? null,
      moduloOrigen: "core",
    };
    if (dryRun)
      return {
        documento: vistaDocumento({ ...data, id: "" }, tipo, hoy()),
        subida: null,
        duplicados,
      };
    const doc = await ctx.transaccion(async (tx) => {
      const d = await tx.documento.create({ data: { ...data, tenantId: ctx.tenantId } });
      await tx.documentoVinculo.create({
        data: {
          tenantId: ctx.tenantId,
          documentoId: d.id,
          entidadTipo: input.entidad.tipo,
          entidadId: input.entidad.id,
          rol: "propietario",
        },
      });
      return d;
    });
    const firmada = await ctx.servicios.almacenamiento.urlSubida(
      doc.storageKey,
      doc.mime,
      input.sha256,
      VIGENCIA_SUBIDA_S,
    );
    return {
      documento: vistaDocumento(doc, tipo, hoy()),
      subida: {
        ...firmada,
        metodo: "PUT" as const,
        expiraEn: new Date(Date.now() + VIGENCIA_SUBIDA_S * 1000).toISOString(),
      },
      duplicados,
    };
  },
});
