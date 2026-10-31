import { Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

const OPCIONES = [
  { id: "periodos", etiqueta: "Períodos", href: "/nomina" },
  { id: "novedades", etiqueta: "Novedades", href: "/nomina/novedades" },
  { id: "calendario", etiqueta: "Calendario", href: "/nomina/calendario" },
];

/** Pestañas por ruta de Nómina (server-first, sin JS de cliente). */
export function NavegacionNomina({ activa }: { activa: "periodos" | "novedades" | "calendario" }) {
  return <Segmentado etiqueta="Secciones de Nómina" opciones={OPCIONES} activa={activa} Link={LinkNext} />;
}
