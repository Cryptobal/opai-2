"use client";

import { useEffect } from "react";

import { programarReintento } from "./recuperar-turno";

/** Escucha visibilitychange/online y reintenta mientras hay recuperación pendiente. */
export function useEscuchaReanudacion(
  activo: boolean,
  reanudar: () => void | Promise<void>,
): void {
  useEffect(() => {
    if (!activo) return;
    const alVolver = () => {
      if (document.visibilityState === "visible") void reanudar();
    };
    const alOnline = () => void reanudar();
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("online", alOnline);
    const cancelar = programarReintento(() => void reanudar());
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("online", alOnline);
      cancelar();
    };
  }, [activo, reanudar]);
}
