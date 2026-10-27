import { LogOut, Settings2, UserRound } from "lucide-react";
import type { ItemMenu } from "@opai/ds";
import { accionSalir } from "@/app/_acciones/auth";
import { trasLimpiarCaches } from "./limpiar-cache-diferido";

export function menuCuentaShell(enErp: boolean, navegar: (href: string) => void, password: () => void): ItemMenu[] {
  return [
    ...(enErp ? [{ id: "pref", grupo: "Cuenta", etiqueta: "Preferencias", icono: Settings2, onSelect: () => navegar("/configuracion/preferencias") }] : []),
    { id: "password", ...(enErp ? {} : { grupo: "Cuenta" }), etiqueta: "Cambiar contraseña", icono: UserRound, onSelect: password },
    { id: "salir", etiqueta: "Cerrar sesión", icono: LogOut, peligro: true, onSelect: () => trasLimpiarCaches(accionSalir) },
  ];
}
