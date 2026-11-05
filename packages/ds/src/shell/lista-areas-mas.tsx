"use client";

import { useId } from "react";

import { cn } from "../cn";
import { EncabezadoAreaMas } from "./encabezado-area-mas";
import { EntradaMas } from "./entrada-mas";
import { type AreaMas, esAreaSuelta } from "./mas-areas";
import { esActivo, type NavItem } from "./types";

type Props = {
  areas: readonly AreaMas[];
  rutaActual: string;
  abiertas: ReadonlySet<string>;
  onAlternar: (id: string) => void;
  /** Rutas fijadas: sus entradas llevan un pin. */
  fijadas: ReadonlySet<string>;
  onNavegar: (href: string) => void;
};

function Area({ area, rutaActual, abierta, onAlternar, fijadas, onNavegar }: Omit<Props, "areas" | "abiertas"> & { area: AreaMas; abierta: boolean }) {
  const lista = useId();
  const entrada = (i: NavItem, raiz = false) => (
    <EntradaMas
      key={i.href}
      item={i}
      raiz={raiz}
      activo={esActivo(rutaActual, i.href, i.exacta, i.activoEn)}
      fijada={fijadas.has(i.href)}
      onNavegar={onNavegar}
    />
  );
  const primera = area.entradas[0];
  if (esAreaSuelta(area) && primera) {
    // Una sola entrada: encabezado y entrada en una fila, sin plegar (lámina 11 del diseño).
    return (
      <div className="flex min-w-0 items-center gap-1">
        <h2 className="m-0 flex h-12 flex-none items-center gap-3 pr-1 pl-2 t-body font-semibold text-fg">
          <area.icono className="size-5 flex-none text-fg-muted" aria-hidden />
          {area.nombre}
        </h2>
        <div className="min-w-0 flex-1">{entrada(primera, true)}</div>
      </div>
    );
  }
  return (
    <div>
      <EncabezadoAreaMas
        nombre={area.nombre}
        icono={area.icono}
        cantidad={area.entradas.length}
        abierta={abierta}
        contienePaginaActual={area.activa}
        controla={lista}
        onAlternar={() => onAlternar(area.id)}
      />
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none",
          abierta ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <ul id={lista} inert={!abierta} className="m-0 min-h-0 list-none overflow-hidden p-0">
          {area.entradas.map((i) => (
            <li key={i.href}>{entrada(i)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Áreas del menú «Más» (variante A): encabezados de 48 px que pliegan su lista de entradas de 48 px. */
export function ListaAreasMas({ areas, abiertas, ...resto }: Props) {
  return (
    <>
      {areas.map((a) => (
        <Area key={a.id} area={a} abierta={abiertas.has(a.id)} {...resto} />
      ))}
    </>
  );
}
