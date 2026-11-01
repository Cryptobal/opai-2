import { ChevronRight } from "lucide-react";
import Link from "next/link";

import type { Grupo } from "./grupos";

/**
 * Migas «Configuración › <Grupo>» sobre el título de la entrada (iPad/escritorio; en teléfono la
 * vuelta la da el «‹ <Grupo>» de la barra superior). `nav` con nombre accesible (CA-10).
 */
export function Migas({ grupo }: { grupo: Grupo }) {
  return (
    <nav
      aria-label="Ruta de configuración"
      className="hidden items-center gap-1 text-sm text-fg-muted md:flex"
    >
      <Link
        href="/configuracion"
        prefetch={false}
        className="rounded-xs outline-none hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        Configuración
      </Link>
      <ChevronRight aria-hidden className="size-3.5 flex-none text-fg-subtle" />
      <Link
        href={`/configuracion/grupo/${grupo.id}`}
        prefetch={false}
        className="rounded-xs outline-none hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {grupo.etiqueta}
      </Link>
    </nav>
  );
}
