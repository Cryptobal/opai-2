import { Badge, cn } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { Buscador } from "@/app/_components/maestros/buscador";

import type { Indice } from "./datos";

const sinTildes = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

type Props = {
  indice: Indice;
  seleccionada?: string;
  q?: string | undefined;
  conBuscador?: boolean;
};

/** Índice del centro de Configuración (19/20): grupos, icono, título y descripción; aprobaciones con contador. */
export function IndiceConfig({ indice, seleccionada, q, conBuscador }: Props) {
  const filtro = sinTildes(q ?? "");
  const visibles = indice.secciones.filter(
    (s) => !filtro || sinTildes(`${s.titulo} ${s.descripcion}`).includes(filtro),
  );
  const grupos = [...new Set(visibles.map((s) => s.grupo))];
  return (
    <nav aria-label="Secciones de configuración" className="flex flex-col pb-4">
      {conBuscador ? (
        <div className="border-b border-border pb-3 md:px-4 md:pt-3">
          <Buscador placeholder="Buscar un ajuste" />
        </div>
      ) : null}
      {grupos.map((g) => (
        <div key={g} className="flex flex-col">
          <h3 className="t-caption px-4 pt-4 pb-1.5 max-md:-mx-4 max-md:border-b max-md:border-border max-md:bg-bg">
            {g}
          </h3>
          <ul className="max-md:-mx-4 max-md:bg-surface">
            {visibles
              .filter((s) => s.grupo === g)
              .map((s) => {
                const activa = s.id === seleccionada;
                const n = s.id === "aprobaciones" ? indice.aprobaciones : 0;
                return (
                  <li key={s.id} className="max-md:border-b max-md:border-border">
                    <LinkNext
                      href={s.href}
                      aria-current={activa ? "page" : undefined}
                      className={cn(
                        "relative flex min-h-11 items-center gap-3 px-4 py-2 text-fg outline-none transition-colors duration-150 hover:bg-bg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
                        activa &&
                          "bg-accent-muted hover:bg-accent-muted before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-[3px] before:bg-accent before:content-['']",
                      )}
                    >
                      <s.icono
                        aria-hidden
                        className={cn(
                          "size-[18px] flex-none text-fg-muted",
                          !conBuscador && "md:max-xl:hidden",
                        )}
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span
                          className={cn(
                            "truncate text-base",
                            activa ? "font-semibold" : "font-medium",
                          )}
                        >
                          {s.titulo}
                        </span>
                        <span className={cn("t-caption truncate", !conBuscador && "md:hidden")}>
                          <span className="md:hidden">{s.corta}</span>
                          <span className="max-md:hidden">{s.descripcion}</span>
                        </span>
                      </span>
                      {n ? <Badge tono="warning">{n}</Badge> : null}
                    </LinkNext>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
      {visibles.length === 0 ? (
        <p className="px-4 py-6 text-base text-fg-muted">Sin ajustes que coincidan.</p>
      ) : null}
    </nav>
  );
}
