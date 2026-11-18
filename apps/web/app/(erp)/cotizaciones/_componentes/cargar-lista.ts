import type { EstadoPantalla } from "@opai/ds";

import { entradaPaginaLista, tamanoPagina } from "@/app/_components/maestros/paginacion-cursor";
import { accesoCpq } from "@/lib/cpq-ui";
import { estadoPantalla } from "@/lib/formato";
import { esUuid } from "@/lib/ids";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import type { CotizacionFila, ListaCotizaciones } from "./datos";

type OpcionLista = { valor: string; etiqueta: string };

function mapFila(c: ListaCotizaciones["items"][number]): CotizacionFila {
  return {
    id: c.id,
    codigo: c.codigo,
    titulo: c.titulo,
    negocioId: c.negocioId,
    negocioTitulo: c.negocioTitulo,
    cuentaTitulo: c.cuentaTitulo ?? null,
    vigente: c.vigente,
    alternativaDeId: c.alternativaDeId,
    resumenCalculo: c.resumenCalculo ?? undefined,
    estadoFicha: c.estadoFicha,
    version: c.version
      ? {
          numero: c.version.numero,
          estado: c.version.estado,
          validaHasta: c.version.validaHasta,
          ventaMensualClp: c.version.ventaMensualClp,
          enviadaEn: c.version.enviadaEn,
        }
      : null,
  };
}

/** Parámetros de lista de cotizaciones (filtros en URL y opciones para chips). */
export async function cargarListaCotizaciones(p: Parametros = {}, negocioId?: string) {
  const archivadas = p.ver === "archivadas";
  const vacio = { cuentas: [] as OpcionLista[], responsables: [] as OpcionLista[], parametros: p, archivadas };
  const acceso = accesoCpq(await identidadActual());
  if (!acceso.leer) {
    return {
      state: "forbidden" as EstadoPantalla,
      items: [] as CotizacionFila[],
      siguiente: null,
      crear: false,
      costos: false,
      ...vacio,
    };
  }
  const [r, cuentas, responsables] = await Promise.all([
    ejecutarComoUsuario<ListaCotizaciones>("erp", "cpq.cotizaciones.list", {
      ...entradaPaginaLista(p),
      ...(negocioId ? { negocioId } : {}),
      ...(archivadas ? { soloArchivadas: true } : {}),
      ...(p.estado ? { estado: p.estado } : {}),
      ...(p.cuenta && esUuid(p.cuenta) ? { cuentaId: p.cuenta } : {}),
      ...(p.responsable && esUuid(p.responsable) ? { responsableId: p.responsable } : {}),
      ...(p.desde ? { enviadaDesde: p.desde } : {}),
      ...(p.hasta ? { enviadaHasta: p.hasta } : {}),
      ...(p.q ? { q: p.q } : {}),
    }),
    ejecutarComoUsuario<{ items: { id: string; nombre: string }[] }>("erp", "core.cuentas.list", { limite: 100 }),
    ejecutarComoUsuario<{ id: string; nombre: string }[]>("erp", "comercial.negocios.responsables", {}),
  ]);
  return {
    archivadas,
    state: estadoPantalla(r),
    crear: acceso.crear,
    costos: acceso.costos,
    siguiente: r.ok ? r.data.siguiente : null,
    items: r.ok ? r.data.items.map(mapFila) : [],
    cuentas: cuentas.ok ? cuentas.data.items.map((c) => ({ valor: c.id, etiqueta: c.nombre })) : [],
    responsables: responsables.ok ? responsables.data.map((x) => ({ valor: x.id, etiqueta: x.nombre })) : [],
    parametros: p,
  };
}