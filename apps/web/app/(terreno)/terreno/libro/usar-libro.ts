"use client";

import { useCallback, useEffect, useState } from "react";

export type NovedadLibro = {
  id: string;
  codigo: string;
  gravedad: "baja" | "media" | "alta";
  estado: string;
  resumen: string;
  personaId: string | null;
  horaHecho: string;
};

/** Lee el libro del equipo cada 30 s y al volver la conexión; `recargar` fuerza una lectura nueva. */
export function useLibro() {
  const [items, setItems] = useState<NovedadLibro[] | null>(null);
  const [falla, setFalla] = useState(false);
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let vivo = true;
    fetch("/api/terreno/libro", { cache: "no-store", credentials: "same-origin" })
      .then((r) =>
        r.ok ? (r.json() as Promise<{ items: NovedadLibro[] }>) : Promise.reject(new Error()),
      )
      .then((x) => {
        if (!vivo) return;
        setItems(x.items);
        setFalla(false);
      })
      .catch(() => vivo && setFalla(true));
    return () => {
      vivo = false;
    };
  }, [version]);
  useEffect(() => {
    const cada = window.setInterval(recargar, 30_000);
    window.addEventListener("online", recargar);
    return () => {
      window.clearInterval(cada);
      window.removeEventListener("online", recargar);
    };
  }, [recargar]);
  return { items, falla, recargar };
}
