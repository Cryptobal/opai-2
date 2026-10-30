import { Card, FilaSeleccionable } from "@opai/ds";

import { LinkIndice } from "@/app/_components/link-indice";

import type { GrupoConEntradas } from "./datos";

/**
 * Tarjeta de grupo de la portada (brief §4.1). Sin contadores (ajuste aprobado 1): ícono, nombre,
 * línea corta y las 2–3 primeras entradas como texto. En iPad/escritorio toda la tarjeta es un enlace
 * a la primera entrada visible del grupo; en teléfono es una fila que lleva a la lista del grupo.
 */
export function TarjetaGrupo({ grupo, entradas }: GrupoConEntradas) {
  const Icono = grupo.icono;
  const primera = entradas[0];
  const previas = entradas
    .slice(0, 3)
    .map((e) => e.titulo)
    .join(" · ");
  return (
    <>
      {/* Teléfono: fila compacta a la lista del grupo. */}
      <FilaSeleccionable
        className="md:hidden"
        Link={LinkIndice}
        href={`/configuracion/grupo/${grupo.id}`}
        inicio={
          <span className="flex size-9 flex-none items-center justify-center rounded-md bg-fill text-fg-muted">
            <Icono aria-hidden className="size-5" />
          </span>
        }
        titulo={grupo.etiqueta}
        secundario={grupo.corta}
      />
      {/* iPad/escritorio: tarjeta con enlace a la primera entrada visible. */}
      <Card className="relative hidden min-h-[132px] flex-col p-4 transition-colors duration-150 hover:border-fg-subtle md:flex">
        {primera ? (
          <LinkIndice
            href={primera.href}
            aria-label={`${grupo.etiqueta}: ${grupo.corta}`}
            className="absolute inset-0 rounded-lg outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
          />
        ) : null}
        <span className="mb-2 flex size-10 items-center justify-center rounded-md bg-fill text-fg-muted">
          <Icono aria-hidden className="size-5" />
        </span>
        <h3 className="t-subheading text-fg">{grupo.etiqueta}</h3>
        <p className="mt-0.5 text-sm text-fg-muted">{grupo.corta}</p>
        {previas ? <p className="mt-2 t-caption truncate">{previas}</p> : null}
      </Card>
    </>
  );
}
