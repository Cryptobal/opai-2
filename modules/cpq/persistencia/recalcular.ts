import type { Contexto } from "@opai/capabilities";

import { calcular, resultadoSinCostos, type ResultadoCalculo } from "../domain/motor";
import { cotizacionDe } from "../capabilities/util";
import { modeloDesdeCatalogo } from "./catalogo-modelo";
import { claveDePatron, mapearVersionCalculo } from "./mapear";
import { fechaCalculoHoy } from "./fecha-calculo";
import { aplicarAvisos, avisosCalculo } from "./avisos-calculo";
import { juegoParaFecha, mutualParaCalculo, proveedorDesdeLineas } from "./proveedor";
import { margenesTenant, supuestosTenant } from "./supuestos";
import { sincronizarSecciones } from "./secciones-sync";
import { mesesContrato, versionParaFicha } from "./version";

export const AVISO_FALTA_UF = "Falta valor UF del día o del período.";

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
  const costos = await ctx.db.cpqCostoCategoria.findMany({
    where: { versionId: version.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return { cot, version, secciones, lineas, costos };
}

type Filas = NonNullable<Awaited<ReturnType<typeof cargarFilasVersion>>>;
/** Cambio en memoria para la vista previa (dryRun): el cálculo ve las filas como quedarían. */
export type AjusteVistaPrevia = {
  lineas?: (l: Filas["lineas"]) => Filas["lineas"];
  version?: (v: Filas["version"]) => Filas["version"];
  costos?: (c: Filas["costos"]) => Filas["costos"];
};

export async function recalcularVersion(
  ctx: Contexto,
  cotizacionId: string,
  numero?: number,
  escribir = true,
  ajuste?: AjusteVistaPrevia,
): Promise<ResultadoCalculo | null> {
  const pack = await cargarFilasVersion(ctx, cotizacionId, numero, escribir && !ajuste);
  if (!pack) return null;
  const { secciones } = pack;
  const lineas = ajuste?.lineas ? ajuste.lineas(pack.lineas) : pack.lineas;
  const version = ajuste?.version ? ajuste.version(pack.version) : pack.version;
  const costos = ajuste?.costos ? ajuste.costos(pack.costos) : pack.costos;
  if (ajuste) escribir = false;
  const consulta = fechaCalculoHoy();
  const resuelto = await juegoParaFecha(ctx, consulta);
  const juego = resuelto.juego;
  const fecha = juego?.fecha ?? consulta;
  const mutual = await mutualParaCalculo(ctx);
  const ufInd = juego?.valores.find((v) => v.indicador === "uf");
  const uf = ufInd ? { valorClpEscalado: Math.round((ufInd.valor as number) * 100), fecha } : null;
  // Colación, movilización, AFP, salud, contrato y líquido objetivo vienen de la línea; lo que la
  // línea no fija, de los supuestos del tenant (CPQ v4; antes colación y movilización iban en 0).
  const proveedor = proveedorDesdeLineas(
    lineas.filter((l) => l.tipo === "puesto"),
    juego,
    mutual.tasa,
    mutual.confirmada,
    await supuestosTenant(ctx),
  );
  const modelo = await modeloDesdeCatalogo(ctx, { persistirCatalogo: escribir });
  const margenes = await margenesTenant(ctx);
  // Los patrones que la empresa configuró en Operaciones (CAR-192): el motor ya no solo conoce los de fábrica.
  const patrones = new Map(
    (await ctx.db.patronTurno.findMany({ where: { activo: true } })).map((p) => [
      claveDePatron(p.nombre),
      { clase: p.clase, diasTrabajo: p.diasTrabajo, diasDescanso: p.diasDescanso, diasSemana: p.diasSemana },
    ]),
  );
  const entrada = mapearVersionCalculo(version, secciones, lineas, modelo, costos, margenes.objetivoPct, patrones);
  const resultado = calcular(
    entrada,
    modelo,
    { fecha, uf, minimoPct: margenes.minimoPct, alertaPct: margenes.alertaPct },
    proveedor,
  );
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
