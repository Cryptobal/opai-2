import type { TenantTx } from "@opai/db";

import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import type { Operacion } from "./ajustar-ops";
import { LINEA_NUEVA, datosLinea, lineaDe, referenciasLinea, seccionDe } from "./ajustar-lineas";
import { instalacionesCotizables } from "./validaciones";

type Version = { id: string; cotizacionId: string };

/**
 * Aplica una operación sobre la versión editable, dentro de la transacción de la capacidad. En
 * vista previa valida todo (referencias, tenant, alcance) pero no escribe. Devuelve qué cambió.
 */
export async function aplicar(
  ctx: Contexto,
  tx: TenantTx,
  v: Version,
  op: Operacion,
  escribir: boolean,
  negocioId: string,
): Promise<string> {
  const ver = { where: { id: v.id } };
  switch (op.op) {
    case "renombrar":
      if (escribir) await tx.cotizacion.update({ where: { id: v.cotizacionId }, data: { titulo: op.titulo } });
      return `Título: «${op.titulo}»`;
    case "cambiar_moneda":
      if (escribir) await tx.versionCotizacion.update({ ...ver, data: { moneda: op.moneda } });
      return `Moneda de presentación: ${op.moneda}`;
    case "cambiar_validez":
      if (escribir)
        await tx.versionCotizacion.update({ ...ver, data: { validaHasta: new Date(`${op.validaHasta}T00:00:00Z`) } });
      return `Válida hasta: ${op.validaHasta}`;
    case "fijar_margen":
      if (escribir)
        await tx.versionCotizacion.update({
          ...ver,
          data: { margenObjetivo: op.margenObjetivo, ...(op.modoMargen ? { modoMargen: op.modoMargen } : {}) },
        });
      return "Margen objetivo actualizado";
    case "fijar_precio":
      if (escribir) await tx.versionCotizacion.update({ ...ver, data: { precioManual: op.precioManual } });
      return op.precioManual == null ? "Precio manual quitado" : "Precio manual fijado";
    case "agregar_seccion": {
      const [inst] = await instalacionesCotizables(ctx, negocioId, [op.instalacionId]);
      if (!inst) throw noEncontrado("La instalación");
      if (await tx.seccionCotizacion.count({ where: { versionId: v.id, instalacionId: inst.id } }))
        throw reglaDeNegocio("La instalación ya tiene su sección.");
      const orden = await tx.seccionCotizacion.count({ where: { versionId: v.id } });
      if (escribir)
        await tx.seccionCotizacion.create({
          data: { tenantId: ctx.tenantId, versionId: v.id, tipo: "instalacion", instalacionId: inst.id, nombre: inst.nombre, orden },
        });
      return `Sección agregada: ${inst.nombre}`;
    }
    case "agregar_comun": {
      if (await tx.seccionCotizacion.count({ where: { versionId: v.id, tipo: "comun" } }))
        throw reglaDeNegocio("La versión ya tiene la sección Común.");
      const orden = await tx.seccionCotizacion.count({ where: { versionId: v.id } });
      if (escribir)
        await tx.seccionCotizacion.create({
          data: { tenantId: ctx.tenantId, versionId: v.id, tipo: "comun", instalacionId: null, nombre: "Común", orden },
        });
      return "Sección Común agregada";
    }
    case "quitar_seccion": {
      const s = await seccionDe(tx, v.id, op.seccionId);
      if (escribir) {
        await tx.lineaCotizacion.deleteMany({ where: { seccionId: s.id } });
        await tx.seccionCotizacion.delete({ where: { id: s.id } });
      }
      return `Sección quitada: ${s.nombre}`;
    }
    case "agregar_linea": {
      await seccionDe(tx, v.id, op.seccionId);
      if (op.tipo === "puesto" && !op.cargoId)
        throw reglaDeNegocio("Una línea de puesto necesita su cargo (§4).");
      await referenciasLinea(tx, op);
      const orden = await tx.lineaCotizacion.count({ where: { seccionId: op.seccionId } });
      if (escribir)
        await tx.lineaCotizacion.create({
          data: {
            ...LINEA_NUEVA,
            ...datosLinea(op),
            nombre: op.nombre,
            tenantId: ctx.tenantId,
            versionId: v.id,
            seccionId: op.seccionId,
            tipo: op.tipo,
            orden,
          },
        });
      return `Línea agregada: ${op.nombre}`;
    }
    case "actualizar_linea": {
      const l = await lineaDe(tx, v.id, op.lineaId);
      if (l.tipo === "puesto" && op.cargoId === null)
        throw reglaDeNegocio("Una línea de puesto necesita su cargo (§4).");
      await referenciasLinea(tx, { ...op, motivoPersonas: op.motivoPersonas ?? l.motivoPersonas });
      if (escribir) await tx.lineaCotizacion.update({ where: { id: l.id }, data: datosLinea(op) });
      return `Línea actualizada: ${op.nombre ?? l.nombre}`;
    }
    case "quitar_linea": {
      const l = await lineaDe(tx, v.id, op.lineaId);
      if (escribir) await tx.lineaCotizacion.delete({ where: { id: l.id } });
      return `Línea quitada: ${l.nombre}`;
    }
  }
}
