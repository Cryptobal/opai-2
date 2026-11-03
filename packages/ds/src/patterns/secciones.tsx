import type { ReactNode } from "react";

import { cn } from "../cn";

type SeccionTarjetaProps = {
  titulo: string;
  /** Texto o acción a la derecha del título ("Editar", "Ver los 3"). */
  accion?: ReactNode;
  children: ReactNode;
  /** Sin relleno interior (tablas y listas que llegan al borde). */
  sinRelleno?: boolean;
  className?: string;
};

/** Sección de un detalle: tarjeta con cabecera (título 16/24 y acción) y cuerpo. */
export function SeccionTarjeta({
  titulo,
  accion,
  children,
  sinRelleno,
  className,
}: SeccionTarjetaProps) {
  return (
    <section className={cn("min-w-0 rounded-lg border border-border bg-surface", className)}>
      <header className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border px-4 py-2">
        <h3 className="text-md font-semibold tracking-[-0.006em] text-fg">{titulo}</h3>
        {accion ? <div className="flex max-w-full min-w-0 items-center gap-2">{accion}</div> : null}
      </header>
      <div className={sinRelleno ? undefined : "p-4"}>{children}</div>
    </section>
  );
}

export type ParGrid = { etiqueta: string; valor: ReactNode; ancho?: boolean; mono?: boolean };

/** Pares etiqueta–valor en grilla de dos columnas (una en teléfono); etiqueta 12/16 sobre el valor. */
export function ParesGrid({
  items,
  unaColumna,
}: {
  items: readonly ParGrid[];
  unaColumna?: boolean;
}) {
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-3.5", !unaColumna && "sm:grid-cols-2")}>
      {items.map((p) => (
        <div key={p.etiqueta} className={cn("min-w-0", p.ancho && "sm:col-span-2")}>
          <dt className="mb-0.5 text-xs font-medium text-fg-subtle">{p.etiqueta}</dt>
          <dd className={cn("text-base break-words text-fg", p.mono && "t-mono")}>
            {p.valor ?? "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Teléfono: acción principal fija sobre la barra inferior ("Crear versión"); en md+ va en la barra superior. */
export function AccionFijaTelefono({
  children,
  compacto = true,
}: {
  children: ReactNode;
  /** false cuando el hijo no es un solo botón (p. ej. aviso de bloqueo con acciones). */
  compacto?: boolean;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-[calc(56px+env(safe-area-inset-bottom))] z-30 -mx-4 mt-4 border-t border-border bg-bg/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur md:hidden",
        compacto && "[&>button]:h-11 [&>button]:w-full",
      )}
    >
      {children}
    </div>
  );
}
