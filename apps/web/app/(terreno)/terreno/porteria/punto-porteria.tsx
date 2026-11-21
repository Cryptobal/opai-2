"use client";

import { useState } from "react";

import { Campo, Select } from "@opai/ds";

export type PuntoPorteria = { id: string; nombre: string };

const CLAVE = "opai.porteria.punto";

/**
 * Punto de acceso desde el que registra este teléfono (CAR-479 parte 2). Se recuerda en el equipo; con un solo punto
 * activo se usa sin preguntar, y si el guardado ya no existe rige el primero.
 */
export function usePunto(puntos: readonly PuntoPorteria[]) {
  // El selector recién se ve cuando llegan los puntos (en el cliente): leer aquí no descuadra la hidratación.
  const [elegido, setElegido] = useState(() =>
    typeof window === "undefined" ? null : window.localStorage.getItem(CLAVE),
  );
  const id = puntos.some((p) => p.id === elegido) ? elegido : (puntos[0]?.id ?? null);
  const elegir = (v: string) => {
    window.localStorage.setItem(CLAVE, v);
    setElegido(v);
  };
  return { id, elegir };
}

export function SelectorPunto({
  puntos,
  id,
  onElegir,
}: {
  puntos: readonly PuntoPorteria[];
  id: string | null;
  onElegir: (id: string) => void;
}) {
  if (puntos.length < 2 || !id) return null;
  return (
    <Campo etiqueta="Punto de acceso" htmlFor="p-punto">
      <Select
        id="p-punto"
        valor={id}
        opciones={puntos.map((p) => ({ valor: p.id, etiqueta: p.nombre }))}
        onCambiar={onElegir}
      />
    </Campo>
  );
}
