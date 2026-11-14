import { Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

export type ActivaAccesos = "registros" | "en_sitio" | "intentos";

const OPCIONES = [
  { id: "registros", etiqueta: "Registros", href: "/accesos" },
  { id: "en_sitio", etiqueta: "En sitio", href: "/accesos?estado=en_sitio" },
  { id: "intentos", etiqueta: "Intentos denegados", href: "/accesos/intentos" },
] as const;

/** Secciones de Accesos en la barra superior (desde xl; a 1024 la barra no muestra insignias), estandarizadas como en el resto del ERP. */
export function SegmentoAccesos({ activa }: { activa: ActivaAccesos }) {
  return (
    <span className="ml-4 hidden items-center xl:inline-flex">
      <Segmentado
        etiqueta="Secciones de Accesos"
        variante="plano"
        activa={activa}
        Link={LinkNext}
        opciones={[...OPCIONES]}
      />
    </span>
  );
}

/** Mismas secciones en teléfono e iPad, arriba del contenido. */
export function SegmentoAccesosMovil({ activa }: { activa: ActivaAccesos }) {
  return (
    <div className="-mx-4 mb-3 overflow-x-auto px-4 xl:hidden">
      <Segmentado
        etiqueta="Secciones de Accesos"
        variante="plano"
        activa={activa}
        Link={LinkNext}
        className="min-w-max"
        opciones={[...OPCIONES]}
      />
    </div>
  );
}
