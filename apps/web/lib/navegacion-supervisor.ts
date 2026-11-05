import { listarModulos } from "@opai/capabilities";
import { PERMISOS_CORE } from "@opai/domain";

/** Entradas de un portal sin áreas (p. ej. Supervisor) que aportan los módulos activos (CAR-197). */
export function entradasModulosPortal(
  portal: string,
  puede: (permiso: string) => boolean,
  modulosActivos: readonly string[],
): { href: string; etiqueta: string; icono: string }[] {
  return listarModulos()
    .filter((m) => modulosActivos.includes(m.id))
    .flatMap((m) =>
      m.navegacion.filter((x) => x.portal === portal && (!x.permiso || puede(x.permiso))),
    )
    .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99))
    .map(({ href, etiqueta, icono }) => ({ href, etiqueta, icono }));
}

type ItemSupervisor = {
  href: string;
  etiqueta: string;
  icono: string;
  exacta?: boolean;
  activoEn?: string;
  fueraInferior?: boolean;
};

/** Navegación del portal Supervisor: Hoy, Instalaciones y lo que aportan los módulos activos. */
export function navegacionSupervisor(
  href: string,
  puede: (permiso: string) => boolean,
  modulosActivos: readonly string[],
): ItemSupervisor[] {
  return [
    // «Hoy» solo en `/supervisor`, pero la ficha de persona (`/supervisor/personas/:id`) cuelga de
    // «Hoy» (se llega por «Atrás → Hoy»), así que `activoEn` la mantiene marcada (H6, t365u/t366u).
    ...(puede(PERMISOS_CORE.documentosRead) && puede(PERMISOS_CORE.personasRead)
      ? [{ href, etiqueta: "Hoy", icono: "Home", exacta: true, activoEn: "/supervisor/personas" }]
      : []),
    ...(puede(PERMISOS_CORE.instalacionesRead)
      ? [{ href: "/supervisor/instalaciones", etiqueta: "Instalaciones", icono: "MapPin" }]
      : []),
    // Módulos activos (Rendiciones, CAR-197): en «Más» del teléfono, sin tocar la barra inferior.
    ...entradasModulosPortal("supervisor", puede, modulosActivos).map((e) => ({
      ...e,
      fueraInferior: true,
    })),
  ];
}
