import { z } from "zod";

import { esEtiquetaFirmada } from "@opai/domain";

import { defineCapability } from "../define";
import { conflicto, prohibido, reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { sinDuplicado } from "../core/maestros/comun";
import { PERMISO_CONFIG, puntoDe } from "./comun";
import { generarEtiquetaFirmada } from "./firma";

const incluyeQr = (modo: string) => modo === "qr" || modo === "qr_gps";

const salidaSchema = z.object({
  puntoId: z.string(),
  etiquetaAnterior: z.string().nullable(),
  etiquetaNueva: z.string(),
  /** La etiqueta nueva siempre es firmada de 2.0 (R7). */
  firmada: z.boolean(),
});

/**
 * Reemplaza la etiqueta QR de un punto (R7, R34). Acto IRREVERSIBLE: la etiqueta anterior queda
 * inválida desde ese momento y su lectura posterior dispara la anomalía «etiqueta reemplazada» (la
 * detecta el PR 3 al marcar, porque la etiqueta reemplazada queda en el historial). Genera un código
 * opaco y firmado nuevo. Para agentes exige aprobación humana (APPROVAL_REQUIRED) por ser
 * irreversible; para personas, solo owner/admin/gerente (no supervisor, rondas.md §7).
 */
export const puntosReemplazarEtiqueta = defineCapability({
  id: "rondas.puntos.reemplazar_etiqueta",
  descripcion:
    "Invalida la etiqueta QR actual de un punto de control y genera una nueva opaca y firmada; la anterior deja de valer y su lectura posterior queda como anomalía «etiqueta reemplazada».",
  permiso: PERMISO_CONFIG,
  input: z.object({ id: uuidSchema, motivo: z.string().trim().min(5).max(500) }),
  output: salidaSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (ctx.rol !== "owner" && ctx.rol !== "admin" && ctx.rol !== "gerente")
      throw prohibido("Solo owner, administrador o gerente pueden reemplazar una etiqueta QR.");
    const punto = await puntoDe(ctx, input.id);
    if (!incluyeQr(punto.modo))
      throw reglaDeNegocio("El punto no usa QR: no tiene etiqueta que reemplazar.");
    if (punto.estado !== "activo")
      throw reglaDeNegocio("No se reemplaza la etiqueta de un punto archivado.");

    const { codigo } = generarEtiquetaFirmada();
    const anterior = punto.etiquetaQr;
    if (dryRun) {
      return { puntoId: punto.id, etiquetaAnterior: anterior, etiquetaNueva: codigo, firmada: true };
    }
    return ctx.transaccion(async (tx) => {
      // Invalida la etiqueta vigente actual (si ya hay fila de historial) o la respalda como
      // «reemplazada» a partir del código denormalizado del punto, para que su lectura futura sea
      // anomalía (R7). Todo en una sola transacción: sin TOCTOU entre invalidar y crear.
      const vigente = await tx.etiquetaQr.findFirst({
        where: { puntoId: punto.id, estado: "vigente" },
      });
      if (vigente) {
        await tx.etiquetaQr.update({
          where: { id: vigente.id },
          data: {
            estado: "reemplazada",
            reemplazadaEn: new Date(),
            reemplazadaPor: ctx.usuario?.id ?? null,
            motivo: input.motivo,
          },
        });
      } else if (anterior) {
        await tx.etiquetaQr.create({
          data: {
            tenantId: ctx.tenantId,
            puntoId: punto.id,
            codigo: anterior,
            firmada: esEtiquetaFirmada(anterior),
            origen: "generada",
            estado: "reemplazada",
            reemplazadaEn: new Date(),
            reemplazadaPor: ctx.usuario?.id ?? null,
            motivo: input.motivo,
          },
        });
      }
      await sinDuplicado(
        tx.etiquetaQr.create({
          data: {
            tenantId: ctx.tenantId,
            puntoId: punto.id,
            codigo,
            firmada: true,
            origen: "generada",
            estado: "vigente",
          },
        }),
        "Otra operación reemplazó la etiqueta al mismo tiempo; vuelve a intentar.",
      );
      await tx.puntoControl.update({ where: { id: punto.id }, data: { etiquetaQr: codigo } });
      await ctx.eventos.emitir(tx, {
        tipo: "rondas.etiqueta.reemplazada",
        entidadTipo: "punto",
        entidadId: punto.id,
        payload: { motivo: input.motivo, teniaAnterior: anterior !== null },
      });
      return { puntoId: punto.id, etiquetaAnterior: anterior, etiquetaNueva: codigo, firmada: true };
    });
  },
});
