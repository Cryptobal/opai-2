"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** Lee y cambia parámetros de la URL sin agregar entradas al historial (filtros, hojas). */
export function useParametros() {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();
  const fijar = useCallback(
    (cambios: Record<string, string | null>) => {
      const p = new URLSearchParams(params);
      for (const [k, v] of Object.entries(cambios)) {
        if (v) p.set(k, v);
        else p.delete(k);
      }
      const q = p.toString();
      router.replace(q ? `${ruta}?${q}` : ruta, { scroll: false });
    },
    [params, router, ruta],
  );
  return { valor: (k: string) => params.get(k), fijar };
}

/** Hoja (Sheet) abierta por un parámetro de la URL (`?nueva=1`): enlazable y con "Atrás" natural. */
export function useHojaUrl(param: string) {
  const v = useParametros().valor(param);
  return {
    abierta: v !== null,
    valor: v,
    // Cierra al instante (historial del navegador) sin esperar el viaje al servidor.
    cerrar: () => {
      const u = new URL(location.href);
      u.searchParams.delete(param);
      history.replaceState(null, "", u);
    },
  };
}
