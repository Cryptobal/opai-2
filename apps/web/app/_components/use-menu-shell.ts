"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useMemo } from "react";

import type { ItemMenu } from "@opai/ds";

import type { Marco } from "@/lib/marco";

import { menuCuentaShell } from "./menu-cuenta-shell";
import { rutaNovedades } from "./novedades/ruta-novedades";
import { useConteoNovedades } from "./novedades/use-conteo-novedades";
import type { DatosShell } from "./tipos-shell";

// El cambio de marco se descarga al elegirlo: no pesa en el JS inicial del marco clásico (ADR-037).
const cambiarAlElegir = (portal: string) => (m: Marco) =>
  void import("./hilo/marco-cliente").then((c) => c.cambiarMarco(portal, m));

export function useMenuShell(
  datos: DatosShell,
  enErp: boolean,
  router: AppRouterInstance,
  onPassword: () => void,
  onPortalInicio?: () => void,
  marco: Marco = "clasico",
): { menuUsuario: readonly ItemMenu[]; novedadesNoLeidas: number } {
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
          ? { actual: marco, onCambiar: cambiarAlElegir(datos.portal) }
          : undefined,
    );
    return { menuUsuario, novedadesNoLeidas };
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
