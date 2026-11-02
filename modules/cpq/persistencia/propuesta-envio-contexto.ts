import { noEncontrado, reglaDeNegocio, type Contexto } from "@opai/capabilities";

import { servicioDesdeFilas } from "./propuesta-tecnica";
import { cargarFilasVersion, proyectarCalculo } from "./recalcular";
import type { ResultadoCalculo } from "../domain/motor";

export async function cargarContextoEnvioPropuesta(
  ctx: Contexto,
  cotizacionId: string,
  versionId: string,
  resultado: ResultadoCalculo,
) {
  const c = await ctx.db.cpqCotizacion.findFirst({ where: { id: cotizacionId } });
  if (!c) throw noEncontrado("La cotización");
  const pack = await cargarFilasVersion(ctx, cotizacionId, undefined, false);
  if (!pack || pack.version.id !== versionId) throw reglaDeNegocio("La versión del envío ya no es válida.");
  const neg = await ctx.db.negocio.findFirst({
    where: { id: c.negocioId },
    select: {
      id: true,
      titulo: true,
      valorMensual: true,
      cuentaId: true,
      embudoId: true,
      etapaId: true,
      estado: true,
      createdAt: true,
    },
  });
  if (!neg?.cuentaId) throw reglaDeNegocio("El negocio no tiene cuenta asociada.");
  const calculoPublico = proyectarCalculo(ctx, resultado);
  const seccionesVista = pack.secciones.map((s) => ({
    nombre: s.nombre,
    lineas: pack.lineas.filter((l) => l.seccionId === s.id).map((l) => ({ nombre: l.nombre, tipo: l.tipo })),
  }));
  const servicio = servicioDesdeFilas({
    codigo: c.codigo,
    versionNumero: pack.version.numero,
    secciones: pack.secciones.map((s) => ({
      nombre: s.nombre,
      lineas: pack.lineas
        .filter((l) => l.seccionId === s.id)
        .map((l) => ({
          nombre: l.nombre,
          tipo: l.tipo,
          posiciones: l.posiciones,
          patron: l.patron,
          horaInicio: l.horaInicio,
          horaFin: l.horaFin,
          diasCobertura: l.diasCobertura,
        })),
    })),
  });
  return { c, pack, neg, calculoPublico, seccionesVista, servicio };
}
