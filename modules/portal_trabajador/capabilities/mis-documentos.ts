import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { dondeMisDocumentos, medirDescarga, PORTAL } from "./mis-documentos-comun";
import { personaPropia } from "./persona-propia";

const fecha = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

const documentoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  tipo: z.string().nullable(),
  mime: z.string(),
  tamano: z.number().int(),
  emitidoEn: z.string().nullable(),
  venceEn: z.string().nullable(),
  subidoEn: z.string(),
});

/**
 * Los documentos de la propia persona del trabajador que la empresa dejó visibles en su portal (CAR-463, parte 2 de
 * CAR-357): contrato, anexos y lo que se le comparta. Ningún input trae un id de persona (ADR-022).
 */
export const misDocumentosListar = defineCapability({
  id: "portal_trabajador.mis_documentos.listar",
  descripcion:
    "Lista los documentos de la propia persona del trabajador que su empresa dejó visibles en el portal: contrato, anexos y otros. Solo los suyos, más recientes primero. No entrega el archivo: para verlo, pide la URL de descarga.",
  permiso: null,
  portales: [PORTAL],
  auditarLectura: (s) => [s.personaId, ...s.items.map((d) => d.id)],
  input: z.object({
    cursor: z.uuid().optional().describe("Id del último documento de la página anterior."),
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.object({
    personaId: z.string(),
    hoy: z.string().describe("Hoy (aaaa-mm-dd) en la zona de la empresa, para leer los vencimientos."),
    items: z.array(documentoSchema),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const persona = await personaPropia(ctx);
    const donde = dondeMisDocumentos(persona.id);
    // Un cursor solo vale si es un documento que la persona puede ver.
    if (input.cursor && !(await ctx.db.documento.findFirst({ where: { id: input.cursor, ...donde }, select: { id: true } })))
      throw noEncontrado("El documento de la página anterior");
    const filas = await ctx.db.documento.findMany({
      where: donde,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limite + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      select: {
        id: true, nombre: true, titulo: true, mime: true, tamano: true, emitidoEn: true, venceEn: true, createdAt: true,
        tipo: { select: { nombre: true } },
      },
    });
    const pagina = filas.slice(0, input.limite);
    const tenant = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { timezone: true } });
    return {
      personaId: persona.id,
      hoy: new Intl.DateTimeFormat("en-CA", { timeZone: tenant?.timezone ?? "America/Santiago" }).format(new Date()),
      siguiente: filas.length > input.limite ? (pagina.at(-1)?.id ?? null) : null,
      items: pagina.map((d) => ({
        id: d.id,
        titulo: d.titulo ?? d.nombre,
        tipo: d.tipo?.nombre ?? null,
        mime: d.mime,
        tamano: d.tamano,
        emitidoEn: fecha(d.emitidoEn),
        venceEn: fecha(d.venceEn),
        subidoEn: d.createdAt.toISOString(),
      })),
    };
  },
});

export const misDocumentosDescargar = defineCapability({
  id: "portal_trabajador.mis_documentos.descargar",
  descripcion:
    "URL firmada para ver o descargar, durante 5 minutos, un documento propio del trabajador que su empresa dejó visible en el portal. Cada descarga queda registrada. Un documento ajeno o no visible responde que no existe.",
  permiso: null,
  portales: [PORTAL],
  // NÚCLEO-H: la salida trae la URL; el id revelado es el del input, ya autorizado por el handler.
  auditarLectura: (_s, entrada) => [entrada.id],
  input: z.object({ id: z.uuid() }),
  output: z.object({ url: z.string(), expiraEn: z.string(), nombre: z.string(), mime: z.string() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { id }) {
    const persona = await personaPropia(ctx);
    const d = await ctx.db.documento.findFirst({
      where: { id, ...dondeMisDocumentos(persona.id) },
      select: { id: true, storageKey: true, nombre: true, mime: true },
    });
    if (!d) throw noEncontrado("El documento");
    const url = await ctx.servicios.almacenamiento.urlDescarga(d.storageKey, d.nombre, 300);
    await medirDescarga(ctx, d.id);
    return { url, expiraEn: new Date(Date.now() + 300_000).toISOString(), nombre: d.nombre, mime: d.mime };
  },
});
