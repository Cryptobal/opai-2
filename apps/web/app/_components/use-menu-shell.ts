"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useMemo } from "react";

import type { ItemMenu } from "@opai/ds";

import type { Marco } from "@/lib/marco";

import { cambiarMarco } from "./hilo/marco-cliente";
import { menuCuentaShell } from "./menu-cuenta-shell";
import { rutaNovedades } from "./novedades/ruta-novedades";
import { useConteoNovedades } from "./novedades/use-conteo-novedades";
import type { DatosShell } from "./tipos-shell";

export function useMenuShell(
  datos: DatosShell,
  enErp: boolean,
  router: AppRouterInstance,
  onPassword: () => void,
  onPortalInicio?: () => void,
  marco: Marco = "clasico",
): { menuUsuario: readonly ItemMenu[] } {
  const novedadesNoLeidas = useConteoNovedades(
    datos.portal,
    datos.epoca,
    Boolean(datos.acceso && datos.tenant),
  );
  return useMemo(() => {
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
        enErp
          ? { actual: marco, onCambiar: (m: Marco) => void cambiarMarco(datos.portal, m) }
          : undefined,
    );
    return { menuUsuario };
  }, [
      datos.acceso,
      datos.iconos,
      datos.portal,
      datos.tenant,
      enErp,
      marco,
      novedadesNoLeidas,
      onPassword,
      onPortalInicio,
      router,
    ],
  );
}
