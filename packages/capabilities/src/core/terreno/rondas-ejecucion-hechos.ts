import type { Hecho } from "./acceso-tipos";
import { TIPOS_HECHO_TERRENO } from "./hechos-tipos";

export type Plantilla = {
  id: string;
  umbralIncompletaPct: number;
  obligatorios: ReadonlySet<string>;
};

export const iniciosDe = (hechos: readonly Hecho[]) =>
  hechos.flatMap((h) => {
    const r =
      h.tipo === "rondas.inicio" ? TIPOS_HECHO_TERRENO["rondas.inicio"].safeParse(h.payload) : null;
    return r?.success ? [{ h, plantillaId: r.data.plantillaId }] : [];
  });
export const cierresDe = (hechos: readonly Hecho[]) =>
  hechos.flatMap((h) => {
    const r =
      h.tipo === "rondas.cierre" ? TIPOS_HECHO_TERRENO["rondas.cierre"].safeParse(h.payload) : null;
    return r?.success ? [{ h, ejecucionClave: r.data.ejecucionClave }] : [];
  });
export const marcasConRondaDe = (hechos: readonly Hecho[]) =>
  hechos.flatMap((h) => {
    const r =
      h.tipo === "rondas.marca" ? TIPOS_HECHO_TERRENO["rondas.marca"].safeParse(h.payload) : null;
    return r?.success && r.data.ejecucionClave
      ? [{ h, ejecucionClave: r.data.ejecucionClave }]
      : [];
  });

export const comoPlantilla = (p: {
  id: string;
  umbralIncompletaPct: number;
  puntos: { puntoId: string; obligatorio: boolean }[];
}): Plantilla => ({
  id: p.id,
  umbralIncompletaPct: p.umbralIncompletaPct,
  obligatorios: new Set(p.puntos.filter((x) => x.obligatorio).map((x) => x.puntoId)),
});

/**
 * Lo que depende de un inicio nuevo de este lote (marcas y cierres de esa ronda): si ese inicio cae por otra regla,
 * también debe caer, para no aceptar «recibido» un cierre o una marca sin ronda donde escribirse.
 */
export function dependenciasDe(
  iniciosOk: readonly { h: Hecho }[],
  previas: readonly { clave: string }[],
  dependientes: readonly { h: Hecho; ejecucionClave: string }[],
): Map<string, string> {
  const nuevos = new Set(
    iniciosOk.filter((i) => !previas.some((e) => e.clave === i.h.clave)).map((i) => i.h.clave),
  );
  const r = new Map<string, string>();
  for (const x of dependientes)
    if (nuevos.has(x.ejecucionClave)) r.set(x.h.clave, x.ejecucionClave);
  return r;
}
