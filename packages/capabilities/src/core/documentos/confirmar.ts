import { filtroDocumentoSensible } from "./sensibles";
import { documentosEnAlcance } from "./alcance-doc";
import { z } from "zod";

import { motivoSubidaInvalida, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { consumoBase } from "../../integraciones/adaptadores";
import { uuidSchema } from "../esquemas";
import { hoy } from "../maestros/comun";
import { documentoSchema, vistaDocumento } from "./vista";

export const documentosConfirmarSubida = defineCapability({
  id: "core.documentos.confirmar_subida",
  descripcion:
    "Segundo paso de la subida: verifica que el archivo llegó con el tamaño, formato y huella SHA-256 declarados, lo deja disponible, lo registra en la bitácora encadenada y, si es una nueva versión, reemplaza a la anterior.",
  permiso: PERMISOS_CORE.documentosManage,
  portales: ["erp", "supervisor"],
  input: z.object({ id: uuidSchema }),
  output: documentoSchema.extend({ bitacoraSeq: z.number().nullable() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const permitidos = await documentosEnAlcance(ctx);
    const d = await ctx.db.documento.findFirst({
      where: {
        ...filtroDocumentoSensible(ctx),
        id: input.id,
        ...(permitidos ? { id: { in: [...permitidos].filter((id) => id === input.id) } } : {}),
      },
    });
    if (!d) throw noEncontrado("El documento");
    if (d.estado !== "pendiente") throw reglaDeNegocio("El documento ya fue confirmado.");
    const tipo = d.tipoId
      ? await ctx.db.documentoTipo.findUnique({ where: { id: d.tipoId } })
      : null;
    const objeto = await ctx.servicios.almacenamiento.head(d.storageKey);
    const motivo = motivoSubidaInvalida(d, objeto);
    if (motivo) throw reglaDeNegocio(motivo);
    if (dryRun)
      return { ...vistaDocumento({ ...d, estado: "disponible" }, tipo, hoy()), bitacoraSeq: null };
    const r = await ctx.transaccion(async (tx) => {
      // Reclamo condicional: dos confirmaciones simultáneas no duplican el hecho en la bitácora.
      const { count } = await tx.documento.updateMany({
        where: { id: d.id, estado: "pendiente" },
        data: { estado: "confirmando" },
      });
      if (count !== 1) throw reglaDeNegocio("El documento ya fue confirmado.");
      const propietario = await tx.documentoVinculo.findFirst({
        where: { documentoId: d.id, rol: "propietario" },
      });
      const hecho = await ctx.bitacora.registrar(tx, {
        tipo: "core.documento.registrado",
        entidadTipo: "documento",
        entidadId: d.id,
        payload: {
          sha256: d.sha256,
          tamano: d.tamano,
          mime: d.mime,
          version: d.version,
          entidad: propietario
            ? { tipo: propietario.entidadTipo, id: propietario.entidadId }
            : null,
        },
      });
      const confirmado = await tx.documento.update({
        where: { id: d.id },
        data: { estado: "disponible", confirmadoEn: new Date(), bitacoraSeq: hecho.seq },
      });
      if (d.reemplazaAId)
        await tx.documento.update({
          where: { id: d.reemplazaAId },
          data: { estado: "reemplazado" },
        });
      await ctx.eventos.emitir(tx, {
        tipo: "core.documento.registrado",
        entidadTipo: "documento",
        entidadId: d.id,
        payload: {
          tipoId: d.tipoId,
          version: d.version,
          reemplazaAId: d.reemplazaAId,
          entidad: propietario
            ? { tipo: propietario.entidadTipo, id: propietario.entidadId }
            : null,
        },
      });
      return { confirmado, seq: hecho.seq };
    });
    // El archivo ya quedó en el almacenamiento antes de medirlo: se registra siempre (yaIncurrido).
    await ctx.medidor
      .registrar({
        ...consumoBase(ctx, "core"),
        recurso: "almacenamiento.subida",
        unidad: "mb",
        cantidad: Math.max(1, Math.ceil(d.tamano / 1_048_576)),
        referenciaTipo: "documento",
        referenciaId: d.id,
        yaIncurrido: true,
      })
      .catch(() => undefined);
    return { ...vistaDocumento(r.confirmado, tipo, hoy()), bitacoraSeq: r.seq };
  },
});
