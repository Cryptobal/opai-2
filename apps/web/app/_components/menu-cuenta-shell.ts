import type { ReactNode } from "react";
import type { ItemMenu } from "@opai/ds";
import { accionSalir } from "@/app/_acciones/auth";
import { trasLimpiarCaches } from "./limpiar-cache-diferido";
import { iconoShell } from "./icono-shell";

export function menuCuentaShell(enErp: boolean, navegar: (href: string) => void, password: () => void, conCuenta = enErp, iconos?: Record<string, ReactNode>): ItemMenu[] {
  const Settings2 = iconoShell("Settings2", iconos);
  const UserRound = iconoShell("UserRound", iconos);
  const LogOut = iconoShell("LogOut", iconos);
  return [
    ...(enErp ? [{ id: "pref", grupo: "Cuenta", etiqueta: "Preferencias", icono: Settings2, onSelect: () => navegar("/configuracion/preferencias") }] : []),
    ...(conCuenta ? [{ id: "mi-cuenta", etiqueta: "Mi cuenta", icono: UserRound, onSelect: () => navegar("/mi-cuenta") }] : []),
    { id: "password", ...(enErp ? {} : { grupo: "Cuenta" }), etiqueta: "Cambiar contraseña", icono: UserRound, onSelect: password },
    { id: "salir", etiqueta: "Cerrar sesión", icono: LogOut, peligro: true, onSelect: () => trasLimpiarCaches(accionSalir) },
  ];
}
