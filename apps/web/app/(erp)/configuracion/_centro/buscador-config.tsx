"use client";

import { Search, Settings } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { InputBusqueda } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import { LinkIndice } from "@/app/_components/link-indice";
import { destinoAjuste } from "@/lib/ajuste-destino";

/** Entrada visible, en forma serializable para el buscador (sin el ícono ni el permiso). */
export type EntradaBuscador = {
  id: string;
  titulo: string;
  descripcion: string;
  grupoId: string;
  grupoEtiqueta: string;
  href: string;
};

type Ajuste = { modulo: string; clave: string; etiqueta: string; grupo: string | null };

const sinTildes = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

type Props = {
  entradas: EntradaBuscador[];
  /** Grupos visibles en orden, para el vacío del buscador. */
  grupos: { id: string; etiqueta: string }[];
  inicial?: string | undefined;
  /** Grilla de tarjetas: se ve cuando no hay búsqueda. */
  children: ReactNode;
};

/**
 * Buscador de la portada (brief §4.1): filtra las entradas visibles en el navegador y, con q ≥ 2,
 * suma los campos de ajuste de `core.config.buscar` (agrupados bajo «Módulos»). Con el campo vacío
 * muestra la grilla de tarjetas; al escribir, los resultados agrupados por tarjeta. El atajo «/»
 * enfoca el campo; ⌘K sigue siendo la paleta global.
 */
export function BuscadorConfig({ entradas, grupos, inicial, children }: Props) {
  const [texto, setTexto] = useState(inicial ?? "");
  const [ajustes, setAjustes] = useState<Ajuste[]>([]);
  const filtro = sinTildes(texto.trim());

  useEffect(() => {
    if (filtro.length < 2) {
      setAjustes([]);
      return;
    }
    let vivo = true;
    const t = setTimeout(async () => {
      const r = await ejecutarCapacidad("erp", "core.config.buscar", { q: texto.trim() });
      // Si `core.config.buscar` falla, se muestran solo las entradas (sin romper la portada).
      if (vivo) setAjustes(r.ok ? (r.data as Ajuste[]) : []);
    }, 180);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [filtro, texto]);

  const porGrupo = useMemo(() => {
    const visibles = entradas.filter(
      (e) => sinTildes(`${e.titulo} ${e.descripcion} ${e.grupoEtiqueta}`).includes(filtro),
    );
    return grupos
      .map((g) => ({ g, items: visibles.filter((e) => e.grupoId === g.id) }))
      .filter((x) => x.items.length > 0);
  }, [entradas, grupos, filtro]);

  const buscando = filtro.length > 0;
  const sinResultados = buscando && porGrupo.length === 0 && ajustes.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <InputBusqueda
        valor={texto}
        onCambiar={setTexto}
        atajo="/"
        placeholder="Busca un ajuste: feriados, logo, API key…"
        aria-label="Buscar un ajuste"
      />
      {!buscando ? children : null}
      {buscando ? (
        <nav aria-label="Resultados de la búsqueda" className="flex flex-col gap-5">
          {porGrupo.map(({ g, items }) => (
            <section key={g.id} className="flex flex-col">
              <h3 className="t-caption px-1 pb-1.5">{g.etiqueta}</h3>
              <ul className="flex flex-col rounded-lg border border-border bg-surface">
                {items.map((e) => (
                  <li key={e.id} className="border-b border-border last:border-b-0">
                    <Fila href={e.href} titulo={e.titulo} ruta={`${g.etiqueta} › ${e.titulo}`} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {ajustes.length > 0 ? (
            <section className="flex flex-col">
              <h3 className="t-caption px-1 pb-1.5">Módulos</h3>
              <ul className="flex flex-col rounded-lg border border-border bg-surface">
                {ajustes.slice(0, 8).map((a) => (
                  <li key={`${a.modulo}.${a.clave}`} className="border-b border-border last:border-b-0">
                    <Fila
                      href={destinoAjuste(a)}
                      titulo={a.etiqueta}
                      ruta={`Configuración${a.grupo ? ` › ${a.grupo}` : ""}`}
                      icono
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {sinResultados ? (
            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
              <p className="text-md font-medium text-fg">No encontramos “{texto.trim()}”</p>
              <p className="text-base text-fg-muted">Prueba con otra palabra.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {grupos.map((g) => (
                  <LinkIndice
                    key={g.id}
                    href={`/configuracion/grupo/${g.id}`}
                    className="rounded-md border border-border px-3 py-1.5 text-sm text-fg outline-none hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    {g.etiqueta}
                  </LinkIndice>
                ))}
              </div>
            </div>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

function Fila({
  href,
  titulo,
  ruta,
  icono,
}: {
  href: string;
  titulo: string;
  ruta: string;
  icono?: boolean;
}) {
  const Icono = icono ? Settings : Search;
  return (
    <LinkIndice
      href={href}
      className="flex min-h-11 items-center gap-3 px-4 py-2 text-fg outline-none transition-colors duration-150 hover:bg-fill dark:hover:bg-bg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
    >
      <Icono aria-hidden className="size-4 flex-none text-fg-subtle" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base font-medium">{titulo}</span>
        <span className="t-caption truncate">{ruta}</span>
      </span>
    </LinkIndice>
  );
}
