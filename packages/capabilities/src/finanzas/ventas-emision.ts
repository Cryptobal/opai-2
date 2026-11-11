import { z } from "zod";

import { adaptadorSiiDe } from "./adaptador-sii";

import { defineCapability } from "../define";
import { describirDocumento } from "./ventas-aprobacion-texto";
import { aFecha, escribirConEvento } from "../core/maestros/comun";
import { reglaDeNegocio } from "../errores";
import { bloquearDocumento } from "./ventas-borrador-editable";
import { vistaDeDocumento } from "./ventas-consulta";
import {
  PERMISO_VENTAS,
  ambienteDe,
  consumirFolio,
  documentoEmitidoIdSchema,
  marcarBorradorEmitido,
} from "./ventas-comun";
import {
  cargarBorradorEmitible,
  huellaBorrador,
  prepararEmision,
  type EmisionPreparada,
} from "./ventas-emision-preparar";
import { exigirOrigenNotaDebito } from "./ventas-nd-cargo";
import { descartarXmlPreparado } from "./ventas-xml";
import { ventaSchema } from "./vistas-venta";
import type { Contexto } from "../types";

const preparadaSchema = z.object({
  documentoId: z.string(),
  folio: z.number().int(),
  fechaEmision: z.string(),
  timbrePdf417: z.string(),
  xmlStorageKey: z.string().nullable(),
  huella: z.string(),
});

export const leerEmisionPreparada = (preparado: unknown): EmisionPreparada | null => {
  const r = preparadaSchema.safeParse(preparado);
  return r.success ? r.data : null;
};

/**
 * Emite un borrador (también lo usa el cierre de mes, que emite en lote). En la ejecución real el DTE llega ya
 * firmado (`prepararEmision`, fuera de la transacción): aquí solo se reclama el folio, se marca emitido y se
 * emite el evento, todo atómico y sin llamadas remotas.
 */
export async function emitirBorrador(
  ctx: Contexto,
  documentoId: string,
  dryRun: boolean,
  preparada?: EmisionPreparada | null,
) {
  const { doc, cuenta, tipo } = await cargarBorradorEmitible(ctx, documentoId);
  const adaptador = await adaptadorSiiDe(ctx);
  if (!adaptador.disponible) throw reglaDeNegocio("El adaptador SII no está disponible.");
  if (dryRun) {
    // La vista previa no firma ni llama al proveedor: muestra el folio que se asignaría, el proveedor y el ambiente.
    const folio = await consumirFolio(ctx, tipo, true);
    const { vistaVenta } = await import("./vistas-venta");
    // La emisión simulada solo usa CAF de certificación (CAR-240), así que ese es su ambiente.
    const simpleapi = adaptador.nombre === "simpleapi";
    const emisionPrevista = simpleapi
      ? { proveedor: "simpleapi" as const, ambiente: await ambienteDe(ctx) }
      : { proveedor: "simulado" as const, ambiente: "certificacion" as const };
    const vista = vistaVenta(
      { ...doc, folio, estadoDte: "enviado" },
      cuenta,
      doc.lineas.map((l) => ({
        id: l.id,
        orden: l.orden,
        glosa: l.glosa,
        monto: l.monto,
      })),
    );
    return { ...vista, emisionPrevista };
  }
  if (!preparada || preparada.documentoId !== doc.id) {
    throw reglaDeNegocio("El documento no llegó firmado a la emisión; reintente.");
  }
  if (huellaBorrador(doc) !== preparada.huella) {
    throw reglaDeNegocio(
      "El borrador cambió mientras se firmaba; revíselo y reintente la emisión.",
    );
  }
  try {
    await escribirConEvento(
      ctx,
      {
        tipo: "finanzas.venta.emitida",
        entidadTipo: "documento_emitido",
        payload: () => ({ folio: preparada.folio, tipoDte: doc.tipoDte }),
      },
      async (tx) => {
        // Bloquea el borrador y comprueba que siga idéntico a lo que se firmó: una edición (CAR-248) que se confirmó
        // después de la comprobación de arriba no puede quedar con un XML firmado de otro contenido.
        await bloquearDocumento(tx, ctx.tenantId, doc.id);
        const actual = await tx.documentoEmitido.findFirst({
          where: { id: doc.id },
          include: { lineas: { orderBy: { orden: "asc" } }, referencias: true },
        });
        if (!actual || huellaBorrador(actual) !== preparada.huella) {
          throw reglaDeNegocio("El borrador cambió mientras se firmaba; revíselo y reintente la emisión.");
        }
        // ND de cargo: bloquea la factura de origen (como la NC que la anularía) y revalida que siga vigente antes de
        // reclamar el folio (CAR-234).
        if (doc.tipoDte === 56 && doc.documentoReferenciaId) {
          await tx.$queryRaw`SELECT id FROM finanzas.documentos_emitidos WHERE id = ${doc.documentoReferenciaId}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
        }
        if (doc.tipoDte === 56) await exigirOrigenNotaDebito({ db: tx }, doc);
        const folio = await consumirFolio(ctx, tipo, false, tx);
        if (folio !== preparada.folio) {
          throw reglaDeNegocio(
            "El folio cambió mientras se firmaba el documento; reintente la emisión.",
          );
        }
        await marcarBorradorEmitido(tx, doc.id, {
          folio,
          fechaEmision: aFecha(preparada.fechaEmision),
          timbrePdf417: preparada.timbrePdf417,
          ...(preparada.xmlStorageKey ? { xmlStorageKey: preparada.xmlStorageKey } : {}),
        });
        return { id: doc.id };
      },
    );
  } catch (e) {
    await descartarXmlPreparado(ctx, preparada.xmlStorageKey);
    throw e;
  }
  return vistaDeDocumento(ctx, doc.id);
}

export const ventasEmitir = defineCapability({
  id: "finanzas.ventas.emitir",
  descripcion:
    "Emite un borrador: asigna folio, firma el XML con el adaptador SII del entorno y deja el documento en estado enviado listo para el SII. Requiere folios CAF y RUT emisor configurados.",
  permiso: PERMISO_VENTAS,
  input: z.object({ documentoId: documentoEmitidoIdSchema }),
  output: ventaSchema,
  efecto: "irreversible",
  dryRun: true,
  exigeAprobacion: () => true,
  describirAprobacion: describirDocumento((d, borrador) => `emitir ${borrador ? "el borrador de " : ""}${d}`),
  // La firma (llamada remota) va antes de la transacción de la escritura.
  preparar: (ctx, input) => prepararEmision(ctx, input.documentoId),
  async handler(ctx, input, { dryRun, preparado }) {
    return emitirBorrador(ctx, input.documentoId, dryRun, leerEmisionPreparada(preparado));
  },
});
