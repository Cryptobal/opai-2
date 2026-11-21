"use client";

import { type ReactNode, useState } from "react";

import { InputBusqueda } from "@opai/ds";

export type FilaLista = { id: string; texto: string; nodo: ReactNode; encabezado?: boolean };

const sinTildes = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Encabezados de área sin módulos visibles tras filtrar (solo grupo Módulos, CAR-744). */
function sinEncabezadosHuerfanos(filas: FilaLista[]): FilaLista[] {
  const out: FilaLista[] = [];
  for (let i = 0; i < filas.length; i++) {
    const f = filas[i]!;
    if (!f.encabezado) {
      out.push(f);
      continue;
    }
    let hayModulo = false;
    for (let j = i + 1; j < filas.length; j++) {
      const g = filas[j]!;
      if (g.encabezado) break;
      hayModulo = true;
      break;
    }
    if (hayModulo) out.push(f);
  }
  return out;
}

type Props = {
  filas: FilaLista[];
  placeholder: string;
  /** Quita encabezados de área sin filas de módulo visibles tras filtrar. */
  quitarEncabezadosAreaVacios?: boolean;
};

/**
 * Buscador propio de la lista de un grupo sin límite de 7 (solo Módulos, REGLA §1.3): filtra en el
 * navegador sin dividir la lista ni scroll interno raro; la columna crece. No usa `?q=` para no
 * chocar con el `?seccion=` de la entrada abierta.
 */
export function FiltroLista({ filas, placeholder, quitarEncabezadosAreaVacios }: Props) {
  const [texto, setTexto] = useState("");
  const filtro = sinTildes(texto.trim());
  const filtradas = filas.filter((f) => !filtro || sinTildes(f.texto).includes(filtro));
  const visibles = quitarEncabezadosAreaVacios ? sinEncabezadosHuerfanos(filtradas) : filtradas;
  return (
    <div className="flex flex-col">
      <div className="border-b border-border pb-3 md:px-4 md:pt-3">
        <InputBusqueda
          valor={texto}
          onCambiar={setTexto}
          placeholder={placeholder}
          aria-label={placeholder}
        />
      </div>
      <ul className="max-md:-mx-4 max-md:bg-surface">
        {visibles.map((f) => (
          <li key={f.id} className={f.encabezado ? undefined : "max-md:border-b max-md:border-border"}>
            {f.nodo}
          </li>
        ))}
      </ul>
      {visibles.length === 0 ? (
        <p className="px-4 py-6 text-base text-fg-muted">Sin módulos que coincidan.</p>
      ) : null}
    </div>
  );
}
