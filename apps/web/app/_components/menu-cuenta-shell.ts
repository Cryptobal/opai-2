import type { ReactNode } from "react";
import type { ItemMenu } from "@opai/ds";
import { accionSalir } from "@/app/_acciones/auth";
import type { Marco } from "@/lib/marco";
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
  /** Atajo para alternar entre el marco clásico y el Hilo (ADR-090); solo en el ERP. */
  diseno?: { actual: Marco; onCambiar: (marco: Marco) => void },
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
            descripcion: "Tema y diseño",
            icono: Sun,
            onSelect: () => navegar("/mi-cuenta/preferencias"),
          },
        ]
      : []),
    ...(enErp && diseno
      ? [
          {
            id: "diseno",
            etiqueta: diseno.actual === "hilo" ? "Volver al diseño clásico" : "Probar el diseño Hilo",
            icono: Sparkles,
            onSelect: () => diseno.onCambiar(diseno.actual === "hilo" ? "clasico" : "hilo"),
          },
        ]
      : []),
    ...(novedades
      ? [
          {
            id: "novedades",
            etiqueta: "Novedades",
            // Número rojo a la derecha de «Novedades» (CAR-316): se ve apenas se abre el menú.
            ...(novedades.noLeidas > 0 ? { contador: novedades.noLeidas } : {}),
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
