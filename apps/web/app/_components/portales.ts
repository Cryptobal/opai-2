import { Home, LayoutGrid, Palette } from "lucide-react";

import type { NavItem, Portal } from "@opai/ds";

/** Portales de OPAI 2.0. Cada uno tiene su route group y, más adelante, su propia navegación. */
export const PORTALES: readonly Portal[] = [
  { id: "erp", etiqueta: "ERP", href: "/" },
  { id: "platform", etiqueta: "Plataforma", href: "/platform" },
  { id: "trabajador", etiqueta: "Trabajador", href: "/trabajador" },
  { id: "terreno", etiqueta: "Terreno", href: "/terreno" },
  { id: "cliente", etiqueta: "Cliente", href: "/cliente" },
  { id: "supervisor", etiqueta: "Supervisor", href: "/supervisor" },
];

const esDesarrollo = process.env.NODE_ENV !== "production";

/** Navegación del Brief 00: solo rutas que existen. Los módulos agregan las suyas desde su manifest. */
export function navDe(portal: string): readonly NavItem[] {
  const raiz = PORTALES.find((p) => p.id === portal)?.href ?? "/";
  const items: NavItem[] = [{ href: raiz, etiqueta: "Inicio", icono: Home }];
  if (portal === "erp")
    items.push({ href: "/platform", etiqueta: "Plataforma", icono: LayoutGrid });
  if (esDesarrollo) items.push({ href: "/ds", etiqueta: "Diseño", icono: Palette });
  return items;
}
