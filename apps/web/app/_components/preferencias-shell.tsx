"use client";

import { memo, useEffect } from "react";

import type { DatosShell } from "./marco-shell";
import { useRegistrarReciente } from "./use-recientes";
import { useShellNavegacion } from "./use-shell-navegacion";
import { useBandejaPendiente } from "./use-bandeja-pendiente";

export type PreferenciasShell = ReturnType<typeof useShellNavegacion> & {
  bandejaPendiente: boolean;
  bandejaContador: number;
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
  useRegistrarReciente(datos.epoca, ruta, pendiente ? "" : titulo, true);
  useEffect(() => {
    onCambiar({ ...preferencias, bandejaPendiente: bandejaContador > 0, bandejaContador });
  });
  return null;
});
