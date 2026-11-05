"use client";

import { RefreshCw, WifiOff } from "lucide-react";
import { useState } from "react";

import { iniciales as inicialesDe } from "./avatar";
import type { GrupoPaleta, ItemPaleta } from "./command-palette";
import { Resaltado } from "./resaltado";
import { Skeleton } from "./skeleton";
import { useBusqueda } from "./use-busqueda";

const POR_SECCION = 5;

type Props = {
  q: string;
  buscar: (q: string) => Promise<readonly GrupoPaleta[]>;
  /** Grupos con el campo vacío: Agente, Recientes y Acciones. */
  iniciales: readonly GrupoPaleta[];
  onElegir: (item: ItemPaleta) => void;
  /** Salida desde «Sin resultados» (por ejemplo, volver al menú). */
  alternativa?: { etiqueta: string; onClick: () => void };
};

const fila =
  "group flex min-h-12 min-w-0 items-center gap-3 rounded-md px-2 py-1 t-body text-fg outline-none hover:bg-fill focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus active:bg-fill";

/**
 * Cuerpo de la búsqueda del teléfono (CAR-182, lámina 19): lo comparten la hoja que abre el ícono de
 * la barra superior y el menú «Más». Estado inicial con los grupos iniciales; con texto, secciones con
 * el término resaltado, hasta cinco por sección y «Ver todos»; sin resultados, cargando y error.
 */
export function BusquedaHoja({ q, buscar, iniciales, onElegir, alternativa }: Props) {
  const b = useBusqueda(q, true, buscar, iniciales);
  const [expandidas, setExpandidas] = useState<ReadonlySet<string>>(new Set());
  const termino = q.trim();
  if (b.error)
    return (
      <div role="alert" className="m-2 flex flex-col items-center gap-2 px-4 py-8 text-center">
        <WifiOff className="size-6 text-danger-fg" aria-hidden />
        <p className="t-body font-semibold">No pudimos buscar</p>
        <p className="t-body-sm text-fg-muted">Revisa tu conexión e inténtalo de nuevo.</p>
        <button
          type="button"
          onClick={b.reintentar}
          className="mt-1 flex h-11 items-center gap-2 rounded-md border border-border-control px-4 t-label outline-none hover:bg-fill focus-visible:outline-2 focus-visible:outline-focus"
        >
          <RefreshCw className="size-4" aria-hidden />
          Reintentar
        </button>
      </div>
    );
  if (b.cargando && b.grupos.length === 0)
    return (
      <div aria-busy="true" aria-label="Buscando" className="px-2 pt-4">
        <Skeleton className="mb-2 h-3 w-20" />
        {[0, 1, 2, 3, 4].map((n) => (
          <div key={n} className="flex h-12 items-center gap-3">
            <Skeleton className="size-5" />
            <Skeleton className="h-3.5 flex-1" />
          </div>
        ))}
      </div>
    );
  if (b.buscando && !b.cargando && b.grupos.length === 0)
    return (
      <div className="flex flex-col gap-2 px-2 pt-6">
        <p className="m-0 t-body font-medium">No encontramos «{termino}»</p>
        <p className="m-0 t-body-sm text-fg-muted">Prueba con otra palabra.</p>
        {alternativa ? (
          <button
            type="button"
            onClick={alternativa.onClick}
            className="mt-1 flex h-11 items-center self-start rounded-md px-2 t-label text-accent outline-none hover:bg-fill focus-visible:outline-2 focus-visible:outline-focus"
          >
            {alternativa.etiqueta}
          </button>
        ) : null}
      </div>
    );
  return (
    <div aria-busy={b.cargando} className="pb-2">
      {b.grupos.map((g) => {
        const todos = expandidas.has(g.titulo) || !b.buscando;
        const items = todos ? g.items : g.items.slice(0, POR_SECCION);
        return (
          <section key={g.titulo} aria-label={g.titulo}>
            <h3 className="t-overline px-2 pt-4 pb-1">{g.titulo}</h3>
            {items.map((it) => (
              <a
                key={it.id}
                href={it.href}
                onClick={(e) => {
                  if (e.button !== 0 || e.metaKey || e.ctrlKey) return;
                  e.preventDefault();
                  onElegir(it);
                }}
                className={fila}
              >
                {it.persona ? (
                  <span
                    aria-hidden
                    className="flex size-5 flex-none items-center justify-center rounded-full bg-fill text-[9px] font-semibold text-fg-muted"
                  >
                    {inicialesDe(it.etiqueta)}
                  </span>
                ) : it.icono ? (
                  <it.icono className="size-5 flex-none text-fg-muted" aria-hidden />
                ) : null}
                <span className="line-clamp-2 min-w-0 flex-1 text-balance">
                  <Resaltado texto={it.etiqueta} q={termino} />
                </span>
                {it.detalle ? (
                  <span className="t-caption max-w-[40%] flex-none truncate">{it.detalle}</span>
                ) : null}
              </a>
            ))}
            {!todos && g.items.length > POR_SECCION ? (
              <button
                type="button"
                onClick={() => setExpandidas(new Set([...expandidas, g.titulo]))}
                className="flex min-h-11 items-center rounded-md px-2 t-label text-accent outline-none focus-visible:outline-2 focus-visible:outline-focus"
              >
                Ver todos ({g.items.length})
              </button>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
