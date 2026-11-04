import {
  Briefcase,
  Building2,
  FolderOpen,
  Folder,
  Landmark,
  MapPin,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Icono de cada área del menú (`AREAS_NAV`); una clave desconocida cae en una carpeta. */
const ICONOS: Record<string, LucideIcon> = {
  comercial: Briefcase,
  operaciones: MapPin,
  personas: Users,
  finanzas: Landmark,
  documentos: FolderOpen,
  clientes: Building2,
};

export function iconoDeArea(area: string | undefined): LucideIcon {
  return (area && ICONOS[area]) || Folder;
}
