"use client";

import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import type { Volver } from "@opai/ds";

/** Opciones de cabecera y contenedor que cada página aporta al shell (ADR-045). */
export type OpcionesPagina = {
  titulo: string;
  volver?: Volver;
  volverSoloTelefono?: boolean;
  /** Con `volverSoloTelefono`: el "Atrás" también en iPad vertical (768–1023), donde la ficha ocupa todo el ancho. */
  volverBajoLg?: boolean;
  acciones?: ReactNode;
  accionesTelefono?: ReactNode;
  insignia?: ReactNode;
  completo?: boolean;
  /** Esqueleto (de servidor, sin JS) que reemplaza el contenido si la navegación pasa de ~200 ms. */
  esqueleto?: ReactNode;
};

/** Lo que el shell necesita de la página para su barra superior (sin el esqueleto, que es del contenido). */
export type Cabecera = Omit<OpcionesPagina, "esqueleto">;

const VACIA: Cabecera = { titulo: "" };

/**
 * Estado de la cabecera que vive fuera de React (una instancia por pestaña del navegador). El shell
 * persiste en el layout del portal (no se vuelve a montar al navegar), así que la barra superior lee
 * el título y las acciones de este almacén y la página los fija al renderizarse. Como no es estado de
 * React, fijarla no re-renderiza la página (solo a los suscriptores del almacén, es decir la barra),
 * y por eso no hay bucle. En el servidor nunca se escribe: `getServerSnapshot` devuelve la cabecera
 * vacía, así que no hay estado compartido entre requests; el cliente la completa tras hidratar.
 */
let estado: Cabecera = VACIA;
const oyentes = new Set<() => void>();

export function fijarCabecera(cabecera: Cabecera): void {
  estado = cabecera;
  for (const avisar of oyentes) avisar();
}

function suscribir(avisar: () => void): () => void {
  oyentes.add(avisar);
  return () => void oyentes.delete(avisar);
}

/** La barra superior del shell lee la cabecera de la página actual. */
export function useCabecera(): Cabecera {
  return useSyncExternalStore(
    suscribir,
    () => estado,
    () => VACIA,
  );
}
