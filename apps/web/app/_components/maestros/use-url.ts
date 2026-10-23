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
      const p = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(cambios)) {
        if (v === null || v === "") p.delete(k);
        else p.set(k, v);
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
  const { valor, fijar } = useParametros();
  return {
    abierta: valor(param) !== null,
    valor: valor(param),
    cerrar: () => fijar({ [param]: null }),
  };
}
