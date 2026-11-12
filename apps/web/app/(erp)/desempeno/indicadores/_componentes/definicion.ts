import type { DefinicionPropio, UsoHecho } from "../../_componentes/tipos";

/** Lo que el formulario edita de la definición; los filtros guardados se conservan aparte. */
export type Borrador = {
  forma: DefinicionPropio["forma"];
  hechoA: string;
  hechoB: string;
  monto: string;
  unidad: "horas" | "dias";
};

export function borradorDe(d: DefinicionPropio | undefined): Borrador {
  const base: Borrador = { forma: "contar", hechoA: "", hechoB: "", monto: "", unidad: "horas" };
  if (!d) return base;
  if (d.forma === "contar") return { ...base, forma: d.forma, hechoA: d.hecho };
  if (d.forma === "sumar") return { ...base, forma: d.forma, hechoA: d.hecho, monto: d.monto };
  if (d.forma === "tiempo") {
    return {
      ...base,
      forma: d.forma,
      hechoA: d.desde.hecho,
      hechoB: d.hasta.hecho,
      unidad: d.unidad,
    };
  }
  return { ...base, forma: d.forma, hechoA: d.parte.hecho, hechoB: d.total.hecho };
}

function usos(d: DefinicionPropio | undefined): UsoHecho[] {
  if (!d) return [];
  if (d.forma === "tiempo") return [d.desde, d.hasta];
  if (d.forma === "porcentaje") return [d.parte, d.total];
  return [d];
}

/** Arma la definición; un hecho que no cambió conserva los filtros que traía (se arman por MCP). */
export function definicionDe(
  b: Borrador,
  original: DefinicionPropio | undefined,
): DefinicionPropio | null {
  // Los filtros (se arman por MCP) solo se conservan si no cambió la forma ni el hecho de esa posición.
  const previos = original?.forma === b.forma ? usos(original) : [];
  const uso = (hecho: string, n: number): UsoHecho => {
    const filtros = previos[n]?.hecho === hecho ? previos[n]?.filtros : undefined;
    return filtros ? { hecho, filtros } : { hecho };
  };
  if (!b.hechoA) return null;
  if (b.forma === "contar") return { forma: "contar", ...uso(b.hechoA, 0) };
  if (b.forma === "sumar")
    return b.monto ? { forma: "sumar", monto: b.monto, ...uso(b.hechoA, 0) } : null;
  if (!b.hechoB) return null;
  return b.forma === "tiempo"
    ? { forma: "tiempo", desde: uso(b.hechoA, 0), hasta: uso(b.hechoB, 1), unidad: b.unidad }
    : { forma: "porcentaje", parte: uso(b.hechoA, 0), total: uso(b.hechoB, 1) };
}

/** true si la definición guardada trae filtros, que la pantalla no muestra ni edita. */
export function tieneFiltros(d: DefinicionPropio | undefined): boolean {
  return usos(d).some((u) => u.filtros && Object.keys(u.filtros).length > 0);
}
