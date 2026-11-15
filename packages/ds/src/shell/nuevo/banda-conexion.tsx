"use client";

import { useSyncExternalStore } from "react";

import { Banda } from "../../components/banda";

const suscribir = (avisar: () => void) => {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
};

/**
 * Banda «Sin conexión» común del diseño nuevo (CAR-335 D4d, ADR-044): aparece al perder la red y se
 * va sola al volver. En el servidor se asume conexión, así que no se pinta nada de más.
 */
export function BandaConexion() {
  const enLinea = useSyncExternalStore(
    suscribir,
    () => navigator.onLine,
    () => true,
  );
  if (enLinea) return null;
  return (
    <Banda mensaje="Sin conexión. Lo que ves puede no estar al día; se pone al día solo al volver la red." />
  );
}
