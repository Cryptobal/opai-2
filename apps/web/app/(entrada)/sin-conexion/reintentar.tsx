"use client";

import { useEffect } from "react";

import { Button } from "@opai/ds";

/** Al volver la red (evento `online`) recarga para traer el contenido; también hay botón manual. */
export function Reintentar() {
  useEffect(() => {
    const alReconectar = () => window.location.reload();
    window.addEventListener("online", alReconectar);
    return () => window.removeEventListener("online", alReconectar);
  }, []);
  return (
    <Button variant="secondary" onClick={() => window.location.reload()}>
      Reintentar
    </Button>
  );
}
