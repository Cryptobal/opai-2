import type { LucideIcon } from "lucide-react";
import { DoorOpen, Home, NotebookPen, Route, UserCheck } from "lucide-react";

export type ModulosTerreno = { asistencia: boolean; rondas: boolean; acceso: boolean };

export type SeccionTerreno = {
  href: string;
  etiqueta: string;
  corta: string;
  titulo: string;
  secundario: string;
  icono: LucideIcon;
  exacta?: boolean;
  /** Si depende de un módulo de la empresa; si no hay clave, siempre está activa. */
  modulo?: keyof ModulosTerreno;
};

const SECCIONES_TERRENO: readonly SeccionTerreno[] = [
  {
    href: "/terreno",
    exacta: true,
    etiqueta: "Inicio",
    corta: "Inicio",
    titulo: "Inicio",
    secundario: "",
    icono: Home,
  },
  {
    href: "/terreno/libro",
    etiqueta: "Libro",
    corta: "Libro",
    titulo: "Libro de novedades",
    secundario: "Anota lo que pasa en la instalación",
    icono: NotebookPen,
  },
  {
    href: "/terreno/marcar",
    etiqueta: "Asistencia",
    corta: "Asistencia",
    titulo: "Marcar asistencia",
    secundario: "Con tu rostro o con tu RUT y PIN",
    icono: UserCheck,
    modulo: "asistencia",
  },
  {
    href: "/terreno/rondas",
    etiqueta: "Rondas",
    corta: "Rondas",
    titulo: "Mis rondas",
    secundario: "Inicia tu recorrido y marca cada punto",
    icono: Route,
    modulo: "rondas",
  },
  {
    href: "/terreno/porteria",
    etiqueta: "Acceso",
    corta: "Acceso",
    titulo: "Control de acceso",
    secundario: "Registra entradas y salidas en la portería",
    icono: DoorOpen,
    modulo: "acceso",
  },
];

export function seccionesActivas(modulos: ModulosTerreno | null): SeccionTerreno[] {
  return SECCIONES_TERRENO.filter((s) => !s.modulo || modulos?.[s.modulo]);
}