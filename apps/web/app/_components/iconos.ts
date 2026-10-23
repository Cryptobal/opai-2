import {
  Briefcase,
  Building2,
  Clock,
  Gauge,
  Home,
  KeyRound,
  LayoutGrid,
  type LucideIcon,
  MapPin,
  Palette,
  Plus,
  Settings,
  SlidersHorizontal,
  UserCheck,
  Users,
} from "lucide-react";

/** Iconos nombrados en manifests y navegación. Un nombre desconocido usa LayoutGrid. */
const ICONOS: Record<string, LucideIcon> = {
  Briefcase,
  Building2,
  Clock,
  Gauge,
  Home,
  KeyRound,
  LayoutGrid,
  MapPin,
  Palette,
  Plus,
  Settings,
  SlidersHorizontal,
  UserCheck,
  Users,
};

export function icono(nombre: string): LucideIcon {
  return ICONOS[nombre] ?? LayoutGrid;
}
