import type { ReactNode } from "react";
import type { ItemMenu } from "@opai/ds";
import { accionSalir } from "@/app/_acciones/auth";
import { trasLimpiarCaches } from "./limpiar-cache-diferido";
import { iconoShell } from "./icono-shell";

export function menuCuentaShell(
  enErp: boolean,
  navegar: (href: string) => void,
  password: () => void,
  conCuenta = enErp,
  iconos?: Record<string, ReactNode>,
  portalInicio?: () => void,
  novedades?: { href: string; noLeidas: number },
): ItemMenu[] {
  const Settings2 = iconoShell("Settings2", iconos);
  const UserRound = iconoShell("UserRound", iconos);
  const Sun = iconoShell("Sun", iconos);
  const Sparkles = iconoShell("Sparkles", iconos);
  return [
    ...(conCuenta
      ? [
          {
            id: "mi-cuenta",
            etiqueta: "Mi cuenta",
            icono: UserRound,
            onSelect: () => navegar("/mi-cuenta"),
          },
        ]
      : []),
    ...(enErp
      ? [
          {
            id: "pref",
            etiqueta: "Preferencias",
            descripcion: "Claro, oscuro o sistema",
            icono: Sun,
            onSelect: () => navegar("/mi-cuenta/preferencias"),
          },
        ]
      : []),
    ...(novedades
      ? [
          {
            id: "novedades",
            etiqueta: "Novedades",
            ...(novedades.noLeidas > 0
              ? { descripcion: `${novedades.noLeidas} sin leer` }
              : {}),
            icono: Sparkles,
            onSelect: () => navegar(novedades.href),
          },
        ]
      : []),
    ...(portalInicio
      ? [
          {
            id: "portal-inicio",
            etiqueta: "Portal de inicio",
            icono: Settings2,
            onSelect: portalInicio,
          },
        ]
      : []),
    ...(!conCuenta
      ? [{ id: "password", etiqueta: "Cambiar contraseña", icono: UserRound, onSelect: password }]
      : []),
    {
      id: "salir",
      etiqueta: "Cerrar sesión",
      separador: true,
      onSelect: () => trasLimpiarCaches(accionSalir),
    },
  ];
}
