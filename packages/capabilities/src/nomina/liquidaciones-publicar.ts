import { createHash } from "node:crypto";
import { z } from "zod";

import { claveDocumento, etiquetaPeriodo, nombreLiquidacionPdf } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { uuid7 } from "../core/documentos/uuid7";
import { bloquearPeriodoAbierto } from "./bloqueos";
import { PERMISO_PERIODOS, iso, periodoDe } from "./comun";
import { exigirVistaCompleta } from "./liquidaciones-lectura";
import { crearDocumentoLiquidacion } from "./guardar-liquidacion-doc";
import { pdfLiquidacion } from "./liquidacion-pdf";

const lineaSchema = z.object({ concepto: z.string(), monto: z.number().int() });

export const EVENTO_LIQUIDACION_PUBLICADA = "nomina.liquidacion.publicada";

export const liquidacionesPublicar = defineCapability({
  id: "nomina.liquidaciones.publicar",
  descripcion:
    "Publica la liquidación revisada de una persona: genera el PDF, lo deja en Mis documentos del portal del trabajador y dispara el aviso por correo personal. Solo aplica con la liquidación en estado revisada; recalcular el período anula la publicación anterior.",
  permiso: PERMISO_PERIODOS,
  input: z.object({ id: uuidSchema }),
  output: z.object({
    documentoId: z.string(),
    publicadaEn: z.string(),
    correoPersonal: z.string().nullable(),
    yaPublicada: z.boolean(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id }, { dryRun }) {
    exigirVistaCompleta(ctx);
    const liq = await ctx.db.nominaLiquidacion.findUnique({ where: { id } });
    if (!liq) throw noEncontrado("La liquidación");
    if (liq.estado !== "revisada") throw reglaDeNegocio("Solo se publican liquidaciones revisadas.");
    const [periodo, persona, tenant] = await Promise.all([
      periodoDe(ctx, liq.periodoId),
      ctx.db.persona.findFirst({
        where: { id: liq.personaId, anonimizadaEn: null },
        select: { rut: true, nombres: true, apellidos: true, emailPersonal: true },
      }),
      ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } }),
    ]);
    if (!persona) throw noEncontrado("La persona");
    const nombre = `${persona.nombres} ${persona.apellidos}`.trim();
    const periodoNombre = etiquetaPeriodo(periodo.anio, periodo.mes);
    const correo = persona.emailPersonal?.trim() || null;
    if (liq.publicadaEn && liq.documentoId) {
      return {
        documentoId: liq.documentoId,
        publicadaEn: iso(liq.publicadaEn) ?? "",
        correoPersonal: correo,
        yaPublicada: true,
      };
    }
    const det = (liq.detalle ?? {}) as Record<string, unknown>;
    const lineas = (v: unknown) => z.array(lineaSchema).catch([]).parse(v);
    const archivo = nombreLiquidacionPdf(periodo.anio, periodo.mes, persona.rut);
    if (dryRun) {
      return { documentoId: "", publicadaEn: "", correoPersonal: correo, yaPublicada: false };
    }
    const bytes = await pdfLiquidacion({
      empresa: tenant?.nombre ?? "",
      periodo: periodoNombre,
      rut: persona.rut,
      nombre,
      diasTrabajados: liq.diasTrabajados,
      haberes: lineas(det.haberes),
      descuentosLegales: lineas(det.descuentosLegales),
      otrosDescuentos: lineas(det.otrosDescuentos),
      liquido: liq.liquido,
      imponible: liq.imponible,
      costoEmpresa: liq.costoEmpresa,
    });
    const docId = uuid7();
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const storageKey = claveDocumento(ctx.tenantId, docId, 1, archivo);
    await ctx.servicios.almacenamiento.subir(storageKey, Buffer.from(bytes), "application/pdf", sha256);
    const publicadaEn = await ctx.transaccion(async (tx) => {
      await bloquearPeriodoAbierto(tx, ctx.tenantId, liq.periodoId);
      const vigente = await tx.nominaLiquidacion.findUnique({ where: { id } });
      if (!vigente || vigente.estado !== "revisada") throw reglaDeNegocio("La liquidación cambió; vuelve a revisarla.");
      if (vigente.publicadaEn) return vigente.publicadaEn;
      await crearDocumentoLiquidacion(tx, ctx, {
        id: docId,
        personaId: liq.personaId,
        nombre: archivo,
        titulo: `Liquidación ${periodoNombre}`,
        tamano: bytes.byteLength,
        storageKey,
        sha256,
      });
      const ahora = new Date();
      await tx.nominaLiquidacion.update({ where: { id }, data: { documentoId: docId, publicadaEn: ahora } });
      await ctx.eventos.emitir(tx, {
        tipo: EVENTO_LIQUIDACION_PUBLICADA,
        entidadTipo: "persona",
        entidadId: liq.personaId,
        payload: { liquidacionId: id, periodoId: liq.periodoId, documentoId: docId, periodo: periodoNombre },
      });
      return ahora;
    });
    return { documentoId: docId, publicadaEn: iso(publicadaEn) ?? "", correoPersonal: correo, yaPublicada: false };
  },
});