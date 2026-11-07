"use client";

import { memo, useEffect } from "react";

import type { DatosShell } from "./marco-shell";
import { useRegistrarReciente } from "./use-recientes";
import { useShellNavegacion } from "./use-shell-navegacion";
import { useBandejaPendiente } from "./use-bandeja-pendiente";
import { useSolicitudesNuevas } from "./use-solicitudes-nuevas";

export type PreferenciasShell = ReturnType<typeof useShellNavegacion> & {
  bandejaPendiente: boolean;
  bandejaContador: number;
  /** Solicitudes nuevas por revisar (número de «Solicitudes» en el menú); 0 sin módulo o sin permiso. */
  solicitudesNuevas: number;
};

/** Mejora posterior a la hidratación: el shell inicial ya tiene la navegación del servidor. */
export const PreferenciasDelShell = memo(function PreferenciasDelShell({
  datos,
  ruta,
  titulo,
  pendiente,
  onCambiar,
}: {
  datos: DatosShell;
  ruta: string;
  titulo: string;
  pendiente: boolean;
  onCambiar: (preferencias: PreferenciasShell) => void;
}) {
  const preferencias = useShellNavegacion(
    datos.grupos,
    datos.navInferior,
    ruta,
    datos.portal,
    true,
    titulo,
    datos.iconos,
  );
  const bandejaContador = useBandejaPendiente(datos.portal, true);
  const solicitudesNuevas = useSolicitudesNuevas(
    datos.portal,
    datos.nav.some((n) => n.href === "/solicitudes"),
    ruta.startsWith("/solicitudes"),
  );
  useRegistrarReciente(datos.epoca, ruta, pendiente ? "" : titulo, true);
  useEffect(() => {
    onCambiar({
      ...preferencias,
      bandejaPendiente: bandejaContador > 0,
      bandejaContador,
      solicitudesNuevas,
    });
  });
  return null;
});
