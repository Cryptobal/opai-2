import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../cn";

type Props = {
  /** Columna izquierda: búsqueda, chips y filas (`FilaSeleccionable`). */
  lista: ReactNode;
  /** Columna derecha: el detalle; sin detalle, un vacío discreto ("Elige una cuenta"). */
  detalle?: ReactNode;
  vacio?: { texto: string; icono?: LucideIcon };
  /**
   * Qué se ve en teléfono, donde no hay vista dividida: la lista (índice) o el detalle (ruta de
   * la entidad, con "Atrás" en la barra superior).
   */
  telefono: "lista" | "detalle";
  /** Ancho de la lista desde 1280: 400 px (por defecto) o 360. */
  anchoXl?: 360 | 400;
  /** Configuración: encabezado externo y columnas dentro del contenedor. */
  contenido?: boolean;
  /**
   * Fichas con lista + detalle: de 768 a 1023 px se ve un solo panel a todo el ancho (la lista en
   * su ruta, el detalle en la suya, con "Volver a la lista") y la vista dividida empieza en 1024.
   */
  unPanelHastaLg?: boolean;
  /** Etiqueta accesible de cada columna. */
  etiquetaLista?: string;
  etiquetaDetalle?: string;
  /** Dentro de otra superficie (muestras de /ds): sin salir del contenedor, alto fijo. */
  incrustado?: boolean;
};

/**
 * Vista dividida (iPad y desktop): lista de 360 px (400 px desde 1280) y detalle. En teléfono la
 * lista y el detalle son pantallas distintas. Sale del contenedor del shell para ocupar el alto.
 */
export function SplitScreen(props: Props) {
  const { lista, detalle, vacio, telefono, anchoXl = 400 } = props;
  const Icono = vacio?.icono;
  const uno = props.unPanelHastaLg === true;
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1",
        props.contenido
          ? "gap-4"
          : props.incrustado
            ? "overflow-hidden rounded-lg border border-border md:h-[440px]"
            : uno
              ? "lg:-mx-6 lg:-mt-5 lg:-mb-8 lg:h-[calc(100dvh-60px)] xl:-mx-8"
              : "md:-mx-6 md:-mt-5 md:-mb-8 md:h-[calc(100dvh-60px)] xl:-mx-8",
      )}
    >
      <section
        aria-label={props.etiquetaLista ?? "Lista"}
        className={cn(
          "min-w-0 flex-col",
          uno
            ? "lg:flex lg:flex-none lg:overflow-y-auto lg:border-r lg:border-border lg:bg-surface lg:w-[360px]"
            : "md:flex md:flex-none md:overflow-y-auto md:border-r md:border-border md:bg-surface",
          !uno && (props.contenido ? "md:w-64" : "md:w-[360px]"),
          !props.contenido && anchoXl === 400 && "xl:w-[400px]",
          telefono === "lista" ? "flex w-full" : "hidden",
        )}
      >
        {lista}
      </section>
      <section
        aria-label={props.etiquetaDetalle ?? "Detalle"}
        className={cn(
          "min-w-0 flex-1 flex-col",
          uno
            ? "lg:flex lg:overflow-y-auto lg:px-6 lg:py-5"
            : "md:flex md:overflow-y-auto md:px-6 md:py-5",
          telefono === "detalle" ? "flex" : uno ? "hidden lg:flex" : "hidden",
        )}
      >
        {detalle ?? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            {Icono ? (
              <span className="flex size-12 items-center justify-center rounded-lg border border-border bg-surface text-fg-muted">
                <Icono className="size-5" aria-hidden />
              </span>
            ) : null}
            <p className="text-base text-fg-subtle">{vacio?.texto ?? "Elige un elemento"}</p>
          </div>
        )}
      </section>
    </div>
  );
}

/** Herramientas sobre la lista de un `SplitScreen`: búsqueda y chips. */
export function HerramientasLista({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 pb-3 md:border-b md:border-border md:px-4 md:pt-3">
      {children}
    </div>
  );
}

/** Línea de metadatos de la lista ("12 cuentas · 6 clientes activos" · orden). */
export function MetaLista({ izquierda, derecha }: { izquierda: ReactNode; derecha?: ReactNode }) {
  return (
    <div className="hidden justify-between border-b border-border px-4 py-2 text-xs font-medium text-fg-subtle md:flex">
      <span>{izquierda}</span>
      {derecha ? <span>{derecha}</span> : null}
    </div>
  );
}
