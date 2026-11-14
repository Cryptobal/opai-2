import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { dondeInstalacionId } from "../rondas/comun";
import { nombresInstalacion, PERMISO_PATENTE, PERMISO_READ } from "./comun";

const salida = z.object({
  id: uuidSchema,
  instalacionId: uuidSchema,
  instalacion: z.string(),
  entradaEn: z.string(),
  recibidoEn: z.string(),
  salidaEn: z.string().nullable(),
  tipoRegistro: z.string(),
  nombre: z.string(),
  empresa: z.string().nullable(),
  motivoVisita: z.string().nullable(),
  docTipo: z.string(),
  documento: z.string(),
  patente: z.string().nullable(),
  origen: z.string(),
  lista: z.enum(["autorizada", "bloqueada"]).nullable(),
  dispositivo: z.string().nullable(),
});

/** Ficha de un registro de acceso (CAR-474, diseño `AccesoDetalle`): solo dentro del alcance del actor. */
export const registrosObtener = defineCapability({
  id: "acceso.registros.get",
  descripcion:
    "Muestra un registro de acceso: quién entró, a qué instalación, por qué equipo, a qué hora (según el servidor) y si salió, con el resultado de listas. El documento va enmascarado (el número completo no se guarda); la patente completa solo para quien puede verla.",
  permiso: PERMISO_READ,
  input: z.object({ id: uuidSchema }),
  output: salida,
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [s.id],
  async handler(ctx, { id }) {
    const r = await ctx.db.registroAcceso.findFirst({
      where: { AND: [{ id }, dondeInstalacionId(ctx)] },
      include: {
        salida: { select: { horaCorregida: true } },
        entradaLista: { select: { tipo: true } },
      },
    });
    if (!r) throw noEncontrado("El registro de acceso");
    const [nombres, disp] = await Promise.all([
      nombresInstalacion(ctx, [r.instalacionId]),
      ctx.db.dispositivo.findFirst({
        where: { id: r.dispositivoId },
        select: { identificador: true, nombre: true },
      }),
    ]);
    const t = r.entradaLista?.tipo;
    const tipoLista: "autorizada" | "bloqueada" | null =
      t === "autorizada" || t === "bloqueada" ? t : null;
    return {
      id: r.id,
      instalacionId: r.instalacionId,
      instalacion: nombres.get(r.instalacionId) ?? "",
      entradaEn: r.horaCorregida.toISOString(),
      recibidoEn: r.recibidoEn.toISOString(),
      salidaEn: r.salida?.horaCorregida.toISOString() ?? null,
      tipoRegistro: r.tipoRegistro,
      nombre: r.nombre,
      empresa: r.empresa,
      motivoVisita: r.motivoVisita,
      docTipo: r.docTipo,
      documento: r.mascara,
      patente: ctx.autorizar(PERMISO_PATENTE) ? r.patente : null,
      origen: r.origen,
      lista: tipoLista,
      dispositivo: disp ? (disp.nombre ?? disp.identificador) : null,
    };
  },
});
