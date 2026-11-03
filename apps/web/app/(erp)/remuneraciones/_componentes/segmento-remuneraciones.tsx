import { Badge, Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

type Activa = "periodos" | "novedades" | "calendario";

const OPCIONES = [
  { id: "periodos", etiqueta: "Períodos", href: "/remuneraciones" },
  { id: "novedades", etiqueta: "Novedades", href: "/remuneraciones/novedades" },
  { id: "calendario", etiqueta: "Calendario", href: "/remuneraciones/calendario" },
] as const;

/** Pestañas planas de Remuneraciones en la barra superior (desde lg). */
export function SegmentoRemuneraciones({ activa }: { activa: Activa }) {
  return (
    <span className="ml-4 hidden items-center gap-3 lg:inline-flex">
      <Badge tono="accent" punto={false}>
        Beta
      </Badge>
      <Segmentado
        etiqueta="Secciones de Remuneraciones"
        variante="plano"
        activa={activa}
        Link={LinkNext}
        opciones={[...OPCIONES]}
      />
    </span>
  );
}

/** Mismas secciones en teléfono e iPad, arriba del contenido. */
export function SegmentoRemuneracionesMovil({ activa }: { activa: Activa }) {
  return (
    <div className="-mx-4 mb-3 flex flex-col gap-2 px-4 lg:hidden">
      <Badge tono="accent" punto={false} className="w-fit">
        Beta
      </Badge>
      <Segmentado
        etiqueta="Secciones de Remuneraciones"
        variante="plano"
        activa={activa}
        Link={LinkNext}
        className="min-w-max"
        opciones={[...OPCIONES]}
      />
    </div>
  );
}

export { OPCIONES, type Activa };
