import type { Contexto } from "@opai/capabilities";

import { calcular, PLANTILLA_SEGURIDAD, resultadoSinCostos, type ResultadoCalculo } from "../domain/motor";
import { cotizacionDe } from "../capabilities/util";
import { mapearVersionCalculo } from "./mapear";
import { juegoParaFecha, proveedorDesdeLineas } from "./proveedor";
import { sincronizarSecciones } from "./secciones-sync";
import { mesesContrato, versionParaFicha } from "./version";

const MINIMO = 100_000;
const ALERTA = 30_000;

export async function cargarFilasVersion(ctx: Contexto, cotizacionId: string, numero?: number) {
  const cot = await cotizacionDe(ctx, cotizacionId);
  const version = await versionParaFicha(ctx, cotizacionId, numero);
  if (!version) return null;
  await sincronizarSecciones(ctx, version.id, cot.negocioId);
  const secciones = await ctx.db.cpqSeccion.findMany({ where: { versionId: version.id }, orderBy: [{ orden: "asc" }] });
  const lineas = await ctx.db.cpqLinea.findMany({
    where: { seccionId: { in: secciones.map((s) => s.id) } },
    orderBy: [{ orden: "asc" }, { id: "asc" }],
  });
  return { cot, version, secciones, lineas };
}

export async function recalcularVersion(
  ctx: Contexto,
  cotizacionId: string,
  numero?: number,
  persistir = true,
): Promise<ResultadoCalculo | null> {
  const pack = await cargarFilasVersion(ctx, cotizacionId, numero);
  if (!pack) return null;
  const { version, secciones, lineas } = pack;
  const consulta = (version.validaHasta ?? new Date()).toISOString().slice(0, 10);
  const juego = await juegoParaFecha(consulta);
  const fecha = juego.fecha;
  const ufInd = juego.valores.find((v) => v.indicador === "uf");
  const uf = ufInd
    ? { valorClpEscalado: Math.round((ufInd.valor as number) * 100), fecha }
    : null;
  const proveedor = proveedorDesdeLineas(
    lineas.filter((l) => l.tipo === "puesto").map((l) => ({
      id: l.id,
      sueldoBaseClp: l.sueldoBaseClp,
      patron: l.patron,
      horaInicio: l.horaInicio,
      horaFin: l.horaFin,
    })),
    juego,
  );
  const entrada = mapearVersionCalculo(version, secciones, lineas);
  const modelo = structuredClone(PLANTILLA_SEGURIDAD);
  const resultado = calcular(entrada, modelo, { fecha, uf, minimoPct: MINIMO, alertaPct: ALERTA }, proveedor);
  if (persistir && version.estado === "borrador") {
    await ctx.db.cpqVersion.update({
      where: { id: version.id },
      data: { ventaMensualClp: resultado.ventaMensual },
    });
    for (const l of lineas.filter((x) => x.tipo === "puesto" && x.sueldoBaseClp)) {
      const d = proveedor.obtener({ lineaId: l.id, fecha });
      if (d) await ctx.db.cpqLinea.update({ where: { id: l.id }, data: { huellaJuegoValores: d.origen } });
    }
  }
  return resultado;
}

export function proyectarCalculo(ctx: Contexto, r: ResultadoCalculo) {
  return ctx.autorizar("cpq:costos.ver") ? r : resultadoSinCostos(r);
}

export { mesesContrato };
