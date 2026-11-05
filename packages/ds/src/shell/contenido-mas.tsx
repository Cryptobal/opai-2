"use client";

import { useMemo, useRef } from "react";

import { Cerrar } from "../components/dialog-partes";
import { HojaMovil } from "../components/hoja-movil";
import { TEXTO_BUSQUEDA } from "../components/hoja-busqueda";
import { InputBusqueda } from "../components/input-busqueda";
import type { ItemMenu } from "../components/menu";
import { EntradaMas } from "./entrada-mas";
import type { ItemFijado } from "./fijados";
import { ListaAreasMas } from "./lista-areas-mas";
import { estructuraMas } from "./mas-areas";
import { useEstadoMas } from "./use-estado-mas";
import { baldosasDeAcceso, RecientesMas } from "./mas-acceso";
import { type BusquedaMasRender, esActivo, type NavItem } from "./types";

type Props = {
  items: readonly NavItem[];
  extras: readonly ItemMenu[];
  abierto: boolean;
  onCerrar: () => void;
  onRestaurarFoco: () => void;
  onNavegar?: ((href: string) => void) | undefined;
  rutaActual: string;
  /** Usuario y empresa: recuerda las áreas abiertas por ellos. */
  epoca?: string;
  fijados?: readonly ItemFijado[];
  errorFijados?: boolean;
  reintentarFijados?: () => void;
  onDesfijar?: (href: string) => void;
  onFijar?: (item: ItemFijado) => void;
  /** Resultados de búsqueda: sin ellos, «Más» no trae campo de búsqueda. */
  busqueda?: BusquedaMasRender | undefined;
  /** Se lee al abrir el menú (localStorage del navegador), no en cada render del shell. */
  recientes?: () => readonly ItemFijado[];
};

/**
 * Contenido del menú móvil, variante A del diseño aprobado (CAR-182): búsqueda que se escribe ahí
 * mismo, «Fijados y recientes» una sola vez, áreas plegables (abierta la de la página actual y las
 * que la persona dejó abiertas) y Configuración al pie. Se descarga al abrir, no con el shell.
 */
export function ContenidoMas(p: Props) {
  const { abierto, onCerrar, rutaActual, epoca, busqueda } = p;
  const { sueltas, areas, pie } = useMemo(() => estructuraMas(p.items, rutaActual), [p.items, rutaActual]);
  const e = useEstadoMas(abierto, areas, epoca, Boolean(busqueda));
  const ultimos = useRef<readonly ItemFijado[]>([]);
  // Se relee al abrir; al cerrar se conserva la última lectura para que la fila no se vacíe mientras la hoja sale.
  const leidos = useMemo<readonly ItemFijado[]>(() => {
    if (abierto) ultimos.current = p.recientes?.() ?? [];
    return ultimos.current;
  }, [abierto, p.recientes]);
  const accesos = baldosasDeAcceso(p.fijados ?? [], leidos);
  const fijadas = useMemo(() => new Set((p.fijados ?? []).map((f) => f.href)), [p.fijados]);
  const navegar = (href: string) => {
    onCerrar();
    (p.onNavegar ?? ((h: string) => window.location.assign(h)))(href);
  };
  const entrada = (i: NavItem) => (
    <EntradaMas
      key={i.href}
      item={i}
      raiz
      activo={esActivo(rutaActual, i.href, i.exacta, i.activoEn)}
      onNavegar={navegar}
    />
  );
  const { enBusqueda, cancelar } = e;
  return (
    <HojaMovil
      abierto={abierto}
      onCerrar={onCerrar}
      onRestaurarFoco={p.onRestaurarFoco}
      titulo="Más"
      onEscape={(ev) => {
        if (!enBusqueda) return;
        ev.preventDefault();
        cancelar();
      }}
    >
      <div ref={e.cabecera} className="flex flex-none items-center gap-1 py-2 pr-1 pl-4">
        {busqueda ? (
          <InputBusqueda
            valor={e.q}
            onCambiar={e.setQ}
            onFocus={e.empezar}
            placeholder={TEXTO_BUSQUEDA}
            aria-label="Buscar o ir a"
            className="min-w-0 flex-1"
          />
        ) : (
          <p className="t-subheading m-0 min-w-0 flex-1 truncate">Más</p>
        )}
        {enBusqueda ? (
          <button
            type="button"
            onClick={cancelar}
            className="flex min-h-11 flex-none items-center rounded-md px-3 t-label text-accent outline-none focus-visible:outline-2 focus-visible:outline-focus"
          >
            Cancelar
          </button>
        ) : (
          <Cerrar />
        )}
      </div>
      {enBusqueda && busqueda ? (
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-border px-2 pb-[env(safe-area-inset-bottom)]">
          {busqueda({ q: e.q, onElegido: onCerrar, onVolver: cancelar })}
        </div>
      ) : null}
      <div className={enBusqueda ? "hidden" : "flex min-h-0 flex-1 flex-col"}>
        {p.fijados || p.recientes ? (
          <div className="flex-none pb-1">
            <RecientesMas
              items={accesos}
              rutaActual={rutaActual}
              onNavegar={navegar}
              fijados={fijadas}
              {...(p.onDesfijar ? { onDesfijar: p.onDesfijar } : {})}
              {...(p.onFijar ? { onFijar: p.onFijar } : {})}
              {...(p.errorFijados ? { error: true } : {})}
              {...(p.reintentarFijados ? { reintentar: p.reintentarFijados } : {})}
            />
          </div>
        ) : null}
        <nav
          ref={e.lista}
          aria-label="Áreas"
          className="min-h-0 flex-1 overflow-y-auto border-t border-border px-2 pt-1 pb-2"
        >
          {sueltas.map(entrada)}
          <ListaAreasMas
            areas={areas}
            rutaActual={rutaActual}
            abiertas={e.abiertas}
            onAlternar={e.alternar}
            fijadas={fijadas}
            onNavegar={navegar}
          />
        </nav>
        {pie.length ? (
          <div className="flex-none border-t border-border px-2 pt-0.5 pb-[max(env(safe-area-inset-bottom),2px)]">
            {pie.map(entrada)}
          </div>
        ) : null}
      </div>
    </HojaMovil>
  );
}
