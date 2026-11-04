// Agrupa las advertencias del lector por recurso, campo y código (solo ids de 1.0, nunca valores).
import type { Plan } from "./plan";

export type AdvertenciaAgrupada = {
  recurso: string;
  campo: string;
  codigo: string;
  idsOpai1: string[];
};

export function agruparAdvertencias(lista: Plan["advertencias"]): AdvertenciaAgrupada[] {
  const grupos = new Map<string, AdvertenciaAgrupada>();
  for (const a of lista) {
    const clave = `${a.recurso}|${a.campo}|${a.codigo}`;
    const g = grupos.get(clave) ?? {
      recurso: a.recurso,
      campo: a.campo,
      codigo: a.codigo,
      idsOpai1: [],
    };
    g.idsOpai1.push(a.idOpai1);
    grupos.set(clave, g);
  }
  return [...grupos.values()];
}
