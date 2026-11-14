import { Segmentado } from "@opai/ds";

import { puedeGestionarListas } from "@/lib/pestanas-modulos";

import { LinkNext } from "@/app/_components/link-next";

export type ActivaAccesos = "registros" | "en_sitio" | "prerregistros" | "intentos" | "listas";

const OPCIONES = [
  { id: "registros", etiqueta: "Registros", href: "/accesos" },
  { id: "en_sitio", etiqueta: "En sitio", href: "/accesos?estado=en_sitio" },
  { id: "prerregistros", etiqueta: "Prerregistros", href: "/accesos/prerregistros" },
  { id: "listas", etiqueta: "Listas", href: "/accesos/listas" },
  { id: "intentos", etiqueta: "Intentos denegados", href: "/accesos/intentos" },
] as const;

/**
 * Secciones de Accesos arriba del contenido, en todos los tamaños: la barra superior del diseño nuevo
 * (ADR-109) no muestra insignias, así que el segmento vive en la página.
 */
export async function SegmentoAccesos({ activa }: { activa: ActivaAccesos }) {
  const listas = await puedeGestionarListas();
  return (
    <div className="-mx-4 mb-3 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <Segmentado
        etiqueta="Secciones de Accesos"
        variante="plano"
        activa={activa}
        Link={LinkNext}
        className="min-w-max"
        opciones={OPCIONES.filter((o) => o.id !== "listas" || listas)}
      />
    </div>
  );
}
