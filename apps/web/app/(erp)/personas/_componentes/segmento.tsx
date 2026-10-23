import { Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

/** Pestañas de la barra superior de Personas (10, 14): "Personas · Cargos y sueldos". */
export function SegmentoPersonas({
  activa,
  plural,
}: {
  activa: "personas" | "cargos";
  plural: string;
}) {
  return (
    <Segmentado
      etiqueta="Secciones"
      variante="plano"
      activa={activa}
      Link={LinkNext}
      className="ml-4 hidden md:inline-flex"
      opciones={[
        { id: "personas", etiqueta: plural, href: "/personas" },
        { id: "cargos", etiqueta: "Cargos y sueldos", href: "/cargos" },
      ]}
    />
  );
}
