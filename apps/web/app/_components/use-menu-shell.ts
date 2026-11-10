"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useMemo } from "react";

import type { ItemMenu } from "@opai/ds";

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
): { menuUsuario: readonly ItemMenu[]; avisoNovedades: boolean } {
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
    );
    return { menuUsuario, avisoNovedades: novedadesNoLeidas > 0 };
  }, [
      datos.acceso,
      datos.iconos,
      datos.portal,
      datos.tenant,
      enErp,
      novedadesNoLeidas,
      onPassword,
      onPortalInicio,
      router,
    ],
  );
}
