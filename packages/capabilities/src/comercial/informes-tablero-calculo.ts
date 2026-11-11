// Cálculo puro del tablero de reportes comerciales (CAR-27 y CAR-298). Sin base de datos: recibe
// filas ya leídas y devuelve agregados. Montos en CLP enteros; porcentajes enteros 0–100.
import { montoMensual, porcentaje } from "./informes-calculo";

type Montos = { valorMensual: number | null; montoEstimadoMensual: number | null };
export type Abierto = Montos & {
  etapaId: string;
  probabilidad: number;
  cierreEstimado: string | null;
  responsableId: string | null;
};
export type Cerrado = Montos & {
  estado: "ganado" | "perdido";
  /** Fecha civil del cierre (ganado o perdido). */
  cerradoEn: string;
  creadoEn: string;
  responsableId: string | null;
  motivoPerdidaId: string | null;
  competidor: string | null;
};
export type Paso = { deEtapaId: string | null; aEtapaId: string; segundos: number | null };
export type EtapaRef = { id: string; orden: number; tipo: string };

const MS_DIA = 86_400_000;
const ponderado = (n: Abierto) => Math.round((montoMensual(n) * n.probabilidad) / 100);
const en = (c: Cerrado, r: { desde: string; hasta: string }) =>
  c.cerradoEn >= r.desde && c.cerradoEn <= r.hasta;

/** Ganados, perdidos, conversión y ciclo promedio (días de creación a ganado) de un rango. */
export function resumenCierre(cerrados: Cerrado[], rango: { desde: string; hasta: string }) {
  const filas = cerrados.filter((c) => en(c, rango));
  const ganados = filas.filter((c) => c.estado === "ganado");
  const perdidos = filas.filter((c) => c.estado === "perdido");
  const dias = ganados.map((g) =>
    Math.max(0, Math.round((Date.parse(g.cerradoEn) - Date.parse(g.creadoEn.slice(0, 10))) / MS_DIA)),
  );
  return {
    ganados: ganados.length,
    perdidos: perdidos.length,
    montoGanadoMensualClp: ganados.reduce((s, n) => s + montoMensual(n), 0),
    montoPerdidoMensualClp: perdidos.reduce((s, n) => s + montoMensual(n), 0),
    conversionPct: filas.length ? porcentaje(ganados.length, filas.length) : null,
    cicloPromedioDias: dias.length ? Math.round(dias.reduce((a, b) => a + b, 0) / dias.length) : null,
  };
}

/** Por etapa abierta: negocios y monto de hoy, días promedio en la etapa y cuántos avanzan. */
export function embudoDe(etapas: EtapaRef[], abiertos: Abierto[], pasos: Paso[]) {
  const orden = new Map(etapas.map((e) => [e.id, e]));
  return etapas
    .filter((e) => e.tipo === "abierta")
    .map((e) => {
      const aqui = abiertos.filter((n) => n.etapaId === e.id);
      const salidas = pasos.filter((p) => p.deEtapaId === e.id);
      const tiempos = salidas.flatMap((p) => (p.segundos === null ? [] : [p.segundos]));
      const avanza = salidas.filter((p) => {
        const a = orden.get(p.aEtapaId);
        return a ? a.tipo === "ganada" || (a.tipo === "abierta" && a.orden > e.orden) : false;
      });
      return {
        etapaId: e.id,
        cantidad: aqui.length,
        montoMensualClp: aqui.reduce((s, n) => s + montoMensual(n), 0),
        diasPromedio: tiempos.length
          ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length / 86_400)
          : null,
        avanzaPct: salidas.length ? porcentaje(avanza.length, salidas.length) : null,
      };
    });
}

/** Pronóstico ponderado (monto × probabilidad) por mes de cierre estimado; lo demás va a «otros». */
export function pronosticoDe(abiertos: Abierto[], meses: string[]) {
  const porMes = new Map(meses.map((m) => [m, { montoMensualClp: 0, ponderadoClp: 0 }]));
  const otros = { cantidad: 0, ponderadoClp: 0 };
  for (const n of abiertos) {
    const celda = n.cierreEstimado ? porMes.get(n.cierreEstimado.slice(0, 7)) : undefined;
    if (celda) {
      celda.montoMensualClp += montoMensual(n);
      celda.ponderadoClp += ponderado(n);
    } else {
      otros.cantidad += 1;
      otros.ponderadoClp += ponderado(n);
    }
  }
  return {
    totalPonderadoClp: abiertos.reduce((s, n) => s + ponderado(n), 0),
    meses: meses.map((mes) => ({ mes, ...(porMes.get(mes) ?? { montoMensualClp: 0, ponderadoClp: 0 }) })),
    fueraDeRango: otros,
  };
}

/** Motivos de pérdida (los sin motivo son una fila más) y competidores más repetidos, de mayor a menor. */
export function perdidasDe(cerrados: Cerrado[], desde: string) {
  const contar = (claves: string[]) => {
    const m = new Map<string, number>();
    for (const c of claves) m.set(c, (m.get(c) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };
  const perdidos = cerrados.filter((c) => c.estado === "perdido" && c.cerradoEn >= desde);
  // Un mismo competidor escrito con otra mayúscula cuenta una vez; se muestra como se escribió primero.
  const visto = new Map<string, string>();
  const competidores = perdidos.flatMap((p) => {
    const nombre = p.competidor?.trim();
    if (!nombre) return [];
    const clave = nombre.toLocaleLowerCase("es");
    if (!visto.has(clave)) visto.set(clave, nombre);
    return [clave];
  });
  return {
    motivos: contar(perdidos.map((p) => p.motivoPerdidaId ?? "")).map(([motivoId, cantidad]) => ({
      motivoId: motivoId || null,
      cantidad,
    })),
    competidores: contar(competidores)
      .slice(0, 3)
      .map(([clave, cantidad]) => ({ nombre: visto.get(clave) ?? clave, cantidad })),
  };
}

/** Tabla por responsable: cartera abierta de hoy y cierres del período. */
export function porResponsable(abiertos: Abierto[], cerrados: Cerrado[], rango: { desde: string; hasta: string }) {
  const ids = new Set<string>();
  for (const n of abiertos) ids.add(n.responsableId ?? "");
  const delRango = cerrados.filter((c) => en(c, rango));
  for (const c of delRango) ids.add(c.responsableId ?? "");
  return [...ids]
    .map((id) => {
      const mios = abiertos.filter((n) => (n.responsableId ?? "") === id);
      const cierre = resumenCierre(
        delRango.filter((c) => (c.responsableId ?? "") === id),
        rango,
      );
      return {
        responsableId: id || null,
        abiertos: mios.length,
        enCursoMensualClp: mios.reduce((s, n) => s + montoMensual(n), 0),
        ponderadoClp: mios.reduce((s, n) => s + ponderado(n), 0),
        ganados: cierre.ganados,
        perdidos: cierre.perdidos,
        conversionPct: cierre.conversionPct,
      };
    })
    .sort((a, b) => b.enCursoMensualClp - a.enCursoMensualClp || b.ganados - a.ganados);
}
