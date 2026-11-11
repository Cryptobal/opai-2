"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { pinDeFicha } from "../pin-ficha-contexto";
import type { PreferenciasShell } from "../preferencias-shell";
import type { DatosShell } from "../tipos-shell";

// Igual que en el marco clásico: se resuelve después de hidratar y no pesa en el JS inicial.
const Preferencias = dynamic(
  () => import("../preferencias-shell").then((m) => m.PreferenciasDelShell),
  { ssr: false },
);

/**
 * Accesos de la persona en el marco Hilo: sus páginas fijadas (para «Tus accesos» de Inicio) y el
 * «Fijar» de la ficha abierta. Es la misma isla de preferencias del marco clásico; de ella aquí no se
 * usa la barra inferior, que el Hilo no tiene.
 */
export function useAccesosHilo(
  datos: DatosShell,
  ruta: string,
  titulo: string,
  pendiente: boolean,
) {
  const [preferencias, setPreferencias] = useState<PreferenciasShell | null>(null);
  const { esFicha, fichaFijada, onFijarFicha } = preferencias ?? {};
  const { boton, menu } = pinDeFicha(Boolean(esFicha), fichaFijada, onFijarFicha);
  const isla = (
    <Preferencias
      datos={datos}
      ruta={ruta}
      titulo={titulo}
      pendiente={pendiente}
      onCambiar={setPreferencias}
    />
  );
  return { preferencias, pinFicha: boton, pinMenu: menu, isla };
}
