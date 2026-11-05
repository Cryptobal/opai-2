import dynamic from "next/dynamic";

import type { BusquedaMasRender, ItemFijado, NavItem } from "@opai/ds";

import type { ReactNode } from "react";

import { AccesosContexto } from "./accesos-contexto";
import { accesosDelShell } from "./accesos-shell";
import type { PreferenciasShell } from "./preferencias-shell";
import type { DatosShell } from "./tipos-shell";
import { useRecientesMas } from "./use-recientes-mas";

// Resultados de búsqueda dentro de «Más» (teléfono): se descargan al tocar el campo, no con el shell.
const BusquedaMas = dynamic(() => import("./busqueda-mas"), { ssr: false });
const SIN_ACCIONES: NonNullable<DatosShell["acciones"]> = [];

/** Búsqueda del teléfono: la paleta (ícono de la barra superior) y los resultados dentro de «Más». */
export function useBusquedaShell(datos: DatosShell, nav: readonly NavItem[], abrirPaleta: () => void) {
  const recientes = useRecientesMas(datos.epoca, nav);
  const busquedaMas: BusquedaMasRender = (p) => (
    <BusquedaMas
      {...p}
      epoca={datos.epoca}
      acciones={datos.acciones ?? SIN_ACCIONES}
      nav={datos.nav}
      agente={Boolean(datos.agente)}
    />
  );
  return { onBuscar: abrirPaleta, recientes, epoca: datos.epoca, busquedaMas };
}

type PropsAccesos = {
  enErp: boolean;
  preferencias: PreferenciasShell | null;
  recientes: () => readonly ItemFijado[];
  acciones: DatosShell["acciones"];
  ruta: string;
  onNavegar: (href: string) => void;
  children: ReactNode;
};

/** Da a las páginas los fijados, recientes y acciones que el shell ya tiene (Inicio, CAR-182). */
export function AccesosProveedor({ children, ...p }: PropsAccesos) {
  const valor = accesosDelShell(p.enErp, p.preferencias, p.recientes, p.acciones, p.ruta, p.onNavegar);
  return <AccesosContexto.Provider value={valor}>{children}</AccesosContexto.Provider>;
}
