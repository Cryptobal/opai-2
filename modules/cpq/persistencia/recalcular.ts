import type { Contexto } from "@opai/capabilities";

import { calcular, resultadoSinCostos, type ResultadoCalculo } from "../domain/motor";
import { cotizacionDe } from "../capabilities/util";
import { modeloDesdeCatalogo } from "./catalogo-modelo";
import { mapearVersionCalculo } from "./mapear";
import { fechaCalculoHoy } from "./fecha-calculo";
import { aplicarAvisos, avisosCalculo } from "./avisos-calculo";
import { juegoParaFecha, mutualParaCalculo, proveedorDesdeLineas } from "./proveedor";
import { sincronizarSecciones } from "./secciones-sync";
import { mesesContrato, versionParaFicha } from "./version";

export const AVISO_FALTA_UF = "Falta valor UF del día o del período.";

const MINIMO = 100_000;
const ALERTA = 30_000;

function puedeEscribirVersion(version: { estado: string }, escribir: boolean) {
  return escribir && version.estado === "borrador";
}

export async function cargarFilasVersion(
  ctx: Contexto,
  cotizacionId: string,
  numero?: number,
  escribir = true,
) {
  const cot = await cotizacionDe(ctx, cotizacionId);
  const version = await versionParaFicha(ctx, cotizacionId, numero);
  if (!version) return null;
  if (puedeEscribirVersion(version, escribir)) await sincronizarSecciones(ctx, version.id, cot.negocioId);
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
  escribir = true,
): Promise<ResultadoCalculo | null> {
  const pack = await cargarFilasVersion(ctx, cotizacionId, numero, escribir);
  if (!pack) return null;
  const { version, secciones, lineas } = pack;
  const consulta = fechaCalculoHoy();
  const resuelto = await juegoParaFecha(ctx, consulta);
  const juego = resuelto.juego;
  const fecha = juego?.fecha ?? consulta;
  const mutual = await mutualParaCalculo(ctx);
  const ufInd = juego?.valores.find((v) => v.indicador === "uf");
  const uf = ufInd ? { valorClpEscalado: Math.round((ufInd.valor as number) * 100), fecha } : null;
  const proveedor = proveedorDesdeLineas(
    lineas.filter((l) => l.tipo === "puesto").map((l) => ({
      id: l.id,
      sueldoBaseClp: l.sueldoBaseClp,
      patron: l.patron,
      horaInicio: l.horaInicio,
      horaFin: l.horaFin,
      colacionClp: 0,
      movilizacionClp: 0,
      tipoContrato: "indefinido",
    })),
    juego,
    mutual.tasa,
    mutual.confirmada,
  );
  const modelo = await modeloDesdeCatalogo(ctx, { persistirCatalogo: escribir });
  const entrada = mapearVersionCalculo(version, secciones, lineas, modelo);
  const resultado = calcular(entrada, modelo, { fecha, uf, minimoPct: MINIMO, alertaPct: ALERTA }, proveedor);
  const advertenciasExtra = [
    ...(resuelto.pendiente ? [resuelto.pendiente] : []),
    ...(!uf && juego ? [AVISO_FALTA_UF] : []),
  ];
  if (advertenciasExtra.length) {
    resultado.advertencias = [...new Set([...resultado.advertencias, ...advertenciasExtra])];
    if (resuelto.pendiente || !uf) resultado.noEnviable = true;
  }
  aplicarAvisos(resultado, avisosCalculo(lineas, resuelto, mutual));
  if (puedeEscribirVersion(version, escribir)) {
    await ctx.db.cpqVersion.update({
      where: { id: version.id },
      data: {
        ventaMensualClp: resultado.ventaMensual,
        calculoCongeladoJson: JSON.stringify(resultado),
      },
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

export function packServicioCotizacion(
  c: { codigo: string },
  pack: {
    version: { numero: number };
    secciones: { id: string; nombre: string }[];
    lineas: {
      seccionId: string;
      nombre: string;
      tipo: string;
      posiciones: number;
      patron: string | null;
      horaInicio: string | null;
      horaFin: string | null;
      diasCobertura: number | null;
    }[];
  },
) {
  return {
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
  };
}

export { mesesContrato };
