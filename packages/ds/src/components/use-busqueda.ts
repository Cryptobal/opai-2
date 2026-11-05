"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import type { GrupoPaleta } from "./command-palette";

/** Teléfono: menos de 768 px (el `md` de Tailwind). En servidor y en la primera pintura, no. */
export function useEsTelefono(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const mq = window.matchMedia("(max-width: 767.98px)");
      mq.addEventListener("change", avisar);
      return () => mq.removeEventListener("change", avisar);
    },
    () => window.matchMedia("(max-width: 767.98px)").matches,
    () => false,
  );
}

type Respuesta = { termino: string; grupos: readonly GrupoPaleta[]; error: boolean };

export const MINIMO_BUSQUEDA = 2;

/**
 * Una sola búsqueda para la paleta y la hoja del teléfono: con menos de dos letras muestra los grupos
 * iniciales (Agente, Recientes, Acciones); con texto llama a `buscar` con 200 ms de pausa y conserva
 * los resultados anteriores mientras llegan los nuevos. Un fallo se ve como error con «Reintentar».
 */
export function useBusqueda(
  q: string,
  activo: boolean,
  buscar: (q: string) => Promise<readonly GrupoPaleta[]>,
  iniciales: readonly GrupoPaleta[],
) {
  const termino = q.trim();
  const buscando = activo && termino.length >= MINIMO_BUSQUEDA;
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
  const [intento, setIntento] = useState(0);
  if (!buscando && respuesta) setRespuesta(null);
  useEffect(() => {
    if (!buscando) return;
    let vigente = true;
    const t = setTimeout(
      () =>
        void buscar(termino)
          .then((grupos) => vigente && setRespuesta({ termino, grupos, error: false }))
          .catch(() => vigente && setRespuesta({ termino, grupos: [], error: true })),
      200,
    );
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [buscando, termino, buscar, intento]);
  const alDia = respuesta?.termino === termino;
  return {
    buscando,
    grupos: buscando ? (respuesta?.grupos ?? []) : iniciales,
    cargando: buscando && !alDia,
    error: buscando && alDia && respuesta.error,
    reintentar: () => {
      setRespuesta(null);
      setIntento((n) => n + 1);
    },
  };
}
