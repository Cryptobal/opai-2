"use client";

import { ChevronDown } from "lucide-react";
import { Collapsible } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "../cn";
import { Badge } from "./badge";

export type BloquePlegableProps = {
  /** Número del paso (1–4) o nada. */
  paso?: number;
  titulo: string;
  /** Texto corto a la derecha del título (por ejemplo «2 puestos»). */
  resumen?: ReactNode;
  /** Pendientes del bloque: 0 muestra «Completo»; más de 0 muestra «N pendiente(s)». */
  pendientes?: number;
  /** Reemplaza al chip del encabezado (por ejemplo el monto de una categoría). */
  derecha?: ReactNode;
  /** Si se da, el chip es neutro con este texto (el paso espera a los anteriores). */
  bloqueado?: string;
  /** Etiqueta cuando no hay pendientes; por defecto «Completo». */
  textoCompleto?: string;
  /** «fila»: versión compacta sin marco propio para anidar dentro de un bloque (costos por categoría). */
  variante?: "tarjeta" | "fila";
  abierto?: boolean;
  onCambiar?: (abierto: boolean) => void;
  abiertoInicial?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Bloque plegable de una ficha en pasos (CAR-192): encabezado de 56 px con el chip de pendientes y
 * contenido que se despliega sin saltos. Sobre Radix Collapsible: teclado, foco visible y
 * `prefers-reduced-motion`.
 */
export function BloquePlegable(p: BloquePlegableProps) {
  const pendientes = p.pendientes ?? 0;
  const fila = p.variante === "fila";
  return (
    <Collapsible.Root
      {...(p.abierto !== undefined ? { open: p.abierto } : { defaultOpen: p.abiertoInicial ?? false })}
      {...(p.onCambiar ? { onOpenChange: p.onCambiar } : {})}
      className={cn(fila ? "border-b border-border last:border-b-0" : "rounded-lg border border-border bg-surface", p.className)}
    >
      <Collapsible.Trigger
        className={cn("group flex w-full items-center gap-3 py-2 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus", fila ? "min-h-11 rounded-md px-1" : "min-h-14 rounded-lg px-4")}
      >
        <span className={cn("min-w-0 flex-1 text-fg", fila ? "t-label" : "t-subheading")}>
          {p.paso ? <span className="mr-2 text-fg-subtle">{p.paso}.</span> : null}
          {p.titulo}
          {p.resumen ? <span className="t-caption ml-2 hidden font-normal text-fg-subtle sm:inline">{p.resumen}</span> : null}
          {/* Teléfono en vertical: el resumen del paso va en una segunda línea (CAR-192). */}
          {p.resumen ? (
            <span className="t-caption block truncate font-normal text-fg-subtle sm:hidden" data-resumen-telefono>
              {p.resumen}
            </span>
          ) : null}
        </span>
        {p.derecha !== undefined ? (
          <span className="t-numeric t-label">{p.derecha}</span>
        ) : p.bloqueado ? (
          <Badge tono="neutro">{p.bloqueado}</Badge>
        ) : pendientes > 0 ? (
          <Badge tono="warning">{pendientes === 1 ? "1 pendiente" : `${pendientes} pendientes`}</Badge>
        ) : (
          <Badge tono="success">{p.textoCompleto ?? "Completo"}</Badge>
        )}
        <ChevronDown
          className="size-5 shrink-0 text-fg-muted transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </Collapsible.Trigger>
      <Collapsible.Content className={cn(fila ? "px-1 pb-3" : "border-t border-border px-4 py-4", "data-[state=open]:animate-[ds-aparecer_150ms_var(--ds-ease)] motion-reduce:animate-none")}>
        {p.children}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
