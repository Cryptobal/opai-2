import {
  Briefcase,
  Building2,
  ClipboardList,
  FileText,
  Landmark,
  type LucideIcon,
  Settings,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";

type Modulo = { etiqueta: string; icono: LucideIcon };

/**
 * Módulo que ve la persona en cada novedad (CAR-430): sale de la pantalla a la que lleva, no de la
 * sesión que la construyó. Una novedad sin ruta conocida usa el nombre del catálogo.
 */
const POR_RUTA: readonly [string, Modulo][] = [
  ["/negocios", { etiqueta: "Comercial", icono: Briefcase }],
  ["/cotizaciones", { etiqueta: "Comercial", icono: Briefcase }],
  ["/cuentas", { etiqueta: "Comercial", icono: Building2 }],
  ["/contactos", { etiqueta: "Comercial", icono: Building2 }],
  ["/instalaciones", { etiqueta: "Operaciones", icono: Building2 }],
  ["/pauta", { etiqueta: "Operaciones", icono: ClipboardList }],
  ["/asistencia", { etiqueta: "Operaciones", icono: ClipboardList }],
  ["/tickets", { etiqueta: "Operaciones", icono: ClipboardList }],
  ["/personas", { etiqueta: "Personas", icono: Users }],
  ["/cargos", { etiqueta: "Personas", icono: Users }],
  ["/remuneraciones", { etiqueta: "Personas", icono: Users }],
  ["/finanzas", { etiqueta: "Finanzas", icono: Landmark }],
  ["/rendiciones", { etiqueta: "Finanzas", icono: Landmark }],
  ["/documentos", { etiqueta: "Documentos", icono: FileText }],
  ["/configuracion", { etiqueta: "Configuración", icono: Settings }],
  ["/mi-cuenta", { etiqueta: "Mi cuenta", icono: UserRound }],
];

export type ItemModuloNovedad = { ruta: string | null; moduloEtiqueta: string };

export function etiquetaModuloVisible(item: ItemModuloNovedad): string {
  return moduloNovedad(item.ruta, item.moduloEtiqueta).etiqueta;
}

export function moduloNovedad(ruta: string | null, etiquetaCatalogo: string): Modulo {
  const encontrado = ruta
    ? POR_RUTA.find(
        ([base]) => ruta === base || ruta.startsWith(`${base}/`) || ruta.startsWith(`${base}?`),
      )
    : undefined;
  if (encontrado) return encontrado[1];
  return {
    etiqueta: etiquetaCatalogo === "Núcleo" ? "General" : etiquetaCatalogo,
    icono: Sparkles,
  };
}
