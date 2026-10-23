import {
  Building2,
  Home,
  KeyRound,
  LayoutGrid,
  type LucideIcon,
  Palette,
  Plus,
  Users,
} from "lucide-react";

/** Iconos nombrados en manifests y navegación. Un nombre desconocido usa LayoutGrid. */
const ICONOS: Record<string, LucideIcon> = {
  Building2,
  Home,
  KeyRound,
  LayoutGrid,
  Palette,
  Plus,
  Users,
};

export function icono(nombre: string): LucideIcon {
  return ICONOS[nombre] ?? LayoutGrid;
}
