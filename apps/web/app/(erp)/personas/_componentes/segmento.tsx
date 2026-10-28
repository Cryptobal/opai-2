import { Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

type Activa = "personas" | "vencimientos";

const opciones = (plural: string) => [
  { id: "personas", etiqueta: plural, href: "/personas" },
  { id: "vencimientos", etiqueta: "Vencimientos", href: "/personas/vencimientos" },
];

/** Pestañas de la barra superior de Personas (10, 14), desde 1024 px: entre 768 y 1023 la barra
 *  no tiene sitio y se montaban sobre el buscador (ficha-un-panel.spec.ts). */
export function SegmentoPersonas({ activa, plural }: { activa: Activa; plural: string }) {
  return (
    <Segmentado
      etiqueta="Secciones"
      variante="plano"
      activa={activa}
      Link={LinkNext}
      className="ml-4 hidden lg:inline-flex"
      opciones={opciones(plural)}
    />
  );
}

/**
 * Las mismas dos secciones en el celular, arriba del contenido, con scroll horizontal si no caben
 * (la barra inferior no tiene Vencimientos). Desde 1024 px están en la barra superior.
 */
export function SegmentoPersonasMovil({ activa }: { activa: Activa }) {
  return (
    <div className="-mx-4 mb-3 overflow-x-auto px-4 lg:hidden">
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
