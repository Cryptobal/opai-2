import { Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

type Activa = "personas" | "cargos" | "vencimientos";

const opciones = (plural: string) => [
  { id: "personas", etiqueta: plural, href: "/personas" },
  { id: "cargos", etiqueta: "Cargos y sueldos", href: "/cargos" },
  { id: "vencimientos", etiqueta: "Vencimientos", href: "/personas/vencimientos" },
];

/** Pestañas de la barra superior de Personas (10, 14), solo en pantallas anchas. */
export function SegmentoPersonas({ activa, plural }: { activa: Activa; plural: string }) {
  return (
    <Segmentado
      etiqueta="Secciones"
      variante="plano"
      activa={activa}
      Link={LinkNext}
      className="ml-4 hidden md:inline-flex"
      opciones={opciones(plural)}
    />
  );
}

/**
 * Las mismas tres secciones en el celular, arriba del contenido, con scroll horizontal si no caben
 * (la barra inferior no tiene Cargos ni Vencimientos). En pantallas anchas están en la barra superior.
 */
export function SegmentoPersonasMovil({ activa }: { activa: Activa }) {
  return (
    <div className="-mx-4 mb-3 overflow-x-auto px-4 md:hidden">
      <Segmentado
        etiqueta="Secciones de Personas"
        activa={activa}
        Link={LinkNext}
        className="min-w-max"
        opciones={opciones("Personas")}
      />
    </div>
  );
}
