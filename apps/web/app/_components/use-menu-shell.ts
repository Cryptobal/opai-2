"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useMemo } from "react";

import type { ItemMenu } from "@opai/ds";

import { accionSalirVerComo } from "@/app/_acciones/ver-como";

import { menuCuentaShell } from "./menu-cuenta-shell";
import { rutaNovedades } from "./novedades/ruta-novedades";
import { useConteoNovedades } from "./novedades/use-conteo-novedades";
import type { DatosShell } from "./tipos-shell";

/** En «ver como» (CAR-528) el menú de la cuenta no es de la persona vista: solo sale de la vista. */
const MENU_VISTA: readonly ItemMenu[] = [
  {
    id: "salir-ver-como",
    etiqueta: "Salir de «ver como»",
    onSelect: () => void accionSalirVerComo(),
  },
];

export function useMenuShell(
  datos: DatosShell,
  enErp: boolean,
  router: AppRouterInstance,
  onPassword: () => void,
  onPortalInicio?: () => void,
): { menuUsuario: readonly ItemMenu[]; novedadesNoLeidas: number } {
  const novedadesNoLeidas = useConteoNovedades(
    datos.portal,
    datos.epoca,
    Boolean(datos.acceso && datos.tenant),
  );
  return useMemo(() => {
    if (datos.vista) return { menuUsuario: MENU_VISTA, novedadesNoLeidas };
    const menuUsuario = menuCuentaShell(
      enErp,
      (href) => router.push(href),
      onPassword,
      datos.portal === "erp" && datos.tenant !== null,
      datos.iconos,
      onPortalInicio,
      datos.acceso && datos.tenant
        ? { href: rutaNovedades(datos.portal), noLeidas: novedadesNoLeidas }
        : undefined,
      enErp && datos.nav.some((item) => item.href === "/configuracion"),
      enErp && datos.verComo === true,
    );
    return { menuUsuario, novedadesNoLeidas };
  }, [
    datos.acceso,
    datos.iconos,
    datos.nav,
    datos.portal,
    datos.tenant,
    datos.verComo,
    datos.vista,
    enErp,
    novedadesNoLeidas,
    onPassword,
    onPortalInicio,
    router,
  ]);
}
