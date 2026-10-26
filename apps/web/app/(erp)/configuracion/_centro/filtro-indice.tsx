"use client";

import { type ReactNode, useEffect, useState } from "react";

import { InputBusqueda } from "@opai/ds";

export type FilaIndice = { id: string; grupo: string; texto: string; nodo: ReactNode };

const sinTildes = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

type Props = {
  filas: FilaIndice[];
  /** Búsqueda inicial (`?q=` en `/configuracion`). */
  inicial?: string | undefined;
  /** Tecla que enfoca la búsqueda; solo en `/configuracion`, donde la sección no tiene la suya. */
  atajo?: string;
};

/**
 * "Buscar un ajuste" del índice de Configuración: filtra en el navegador para que la búsqueda
 * esté igual en la raíz y en cada sección sin chocar con el `?q=` propio de la sección.
 */
export function FiltroIndice({ filas, inicial, atajo }: Props) {
  const [texto, setTexto] = useState(inicial ?? "");
  useEffect(() => {
    if (!atajo) return;
    const tecla = (e: KeyboardEvent) => {
      const destino = e.target as HTMLElement | null;
      if (e.key !== atajo || destino?.closest("input, textarea, [contenteditable]")) return;
      e.preventDefault();
      document.querySelector<HTMLInputElement>('input[data-buscador="ajuste"]')?.focus();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [atajo]);
  const filtro = sinTildes(texto.trim());
  const visibles = filas.filter((f) => !filtro || sinTildes(f.texto).includes(filtro));
  const grupos = [...new Set(visibles.map((f) => f.grupo))];
  return (
    <nav aria-label="Secciones de configuración" className="flex flex-col pb-4">
      <div className="border-b border-border pb-3 md:px-4 md:pt-3">
        <InputBusqueda
          valor={texto}
          onCambiar={setTexto}
          placeholder="Buscar un ajuste"
          aria-label="Buscar un ajuste"
          {...(atajo ? { atajo } : {})}
          data-buscador="ajuste"
        />
      </div>
      {grupos.map((g) => (
        <div key={g} className="flex flex-col">
          <h3 className="t-caption px-4 pt-4 pb-1.5 max-md:-mx-4 max-md:border-b max-md:border-border max-md:bg-bg">
            {g}
          </h3>
          <ul className="max-md:-mx-4 max-md:bg-surface">
            {visibles
              .filter((f) => f.grupo === g)
              .map((f) => (
                <li key={f.id} className="max-md:border-b max-md:border-border">
                  {f.nodo}
                </li>
              ))}
          </ul>
        </div>
      ))}
      {visibles.length === 0 ? (
        <p className="px-4 py-6 text-base text-fg-muted">Sin ajustes que coincidan.</p>
      ) : null}
    </nav>
  );
}
