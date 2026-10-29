"use client";

import { useCallback, useEffect, useState } from "react";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import type { Excepcion } from "./excepciones-usuario";

/** Excepciones de un usuario: null mientras carga, Error si falló; `recargar` tras cada cambio. */
export function useExcepciones(membershipId: string) {
  const [excepciones, setExcepciones] = useState<Excepcion[] | null | Error>(null);
  const leer = useCallback(
    () => ejecutarCapacidad("erp", "core.excepciones.list", { membershipId }),
    [membershipId],
  );
  const recargar = useCallback(async () => {
    const r = await leer();
    setExcepciones(r.ok ? (r.data as Excepcion[]) : new Error(r.error.message));
  }, [leer]);
  useEffect(() => {
    let vigente = true;
    void leer().then((r) => {
      if (vigente) setExcepciones(r.ok ? (r.data as Excepcion[]) : new Error(r.error.message));
    });
    return () => {
      vigente = false;
    };
  }, [leer]);
  return { excepciones, recargar };
}
