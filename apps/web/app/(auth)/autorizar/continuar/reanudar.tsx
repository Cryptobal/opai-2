"use client";

import { useEffect } from "react";

import { Loading } from "@opai/ds";

/**
 * Reanuda la autorización con navegación completa: el proveedor responde con redirecciones que
 * pueden terminar en la app externa, así que no se usa el router de Next.
 */
export function Reanudar({ url }: { url: string }) {
  useEffect(() => {
    window.location.replace(url);
  }, [url]);
  return <Loading variante="formulario" />;
}
