import {
  Briefcase,
  Building2,
  Clock,
  FileText,
  Gauge,
  Home,
  KeyRound,
  LayoutGrid,
  LogOut,
  type LucideIcon,
  MapPin,
  Palette,
  PenLine,
  Pin,
  Plus,
  Settings,
  Settings2,
  SlidersHorizontal,
  UserCheck,
  Users,
  UserRound,
} from "lucide-react";

/** Iconos nombrados en manifests y navegación. Un nombre desconocido usa LayoutGrid. */
const ICONOS: Record<string, LucideIcon> = {
  Briefcase,
  Building2,
  Clock,
  FileText,
  Gauge,
  Home,
  KeyRound,
  LayoutGrid,
  LogOut,
  MapPin,
  Palette,
  PenLine,
  Pin,
  Plus,
  Settings,
  Settings2,
  SlidersHorizontal,
  UserCheck,
  Users,
  UserRound,
};

export function icono(nombre: string): LucideIcon {
  return ICONOS[nombre] ?? LayoutGrid;
}
