"use client";

import { ChevronsUpDown, Search } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { cn } from "../cn";
import { Chip } from "./chip";
import type { ComboboxProps } from "./combobox-cmdk";
import { claseControl } from "./select";

export type { ComboboxProps } from "./combobox-cmdk";

const ComboboxCmdk = lazy(() =>
  import("./combobox-cmdk").then((m) => ({ default: m.ComboboxCmdk })),
);

/** Disparador estático: el mismo control que el combobox real, sin cmdk ni Radix (ADR-037). */
function Disparador(props: ComboboxProps & { onActivar?: () => void }) {
  const multiple = props.valores !== undefined;
  const elegidos = multiple ? [...(props.valores ?? [])] : props.valor ? [props.valor] : [];
  const etiquetaDe = (v: string) => props.opciones.find((o) => o.valor === v)?.etiqueta ?? v;
  return (
    <>
      {multiple && elegidos.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {elegidos.map((v) => (
            <Chip key={v} valor={etiquetaDe(v)} />
          ))}
        </div>
      ) : null}
      <button
        type="button"
        {...(props.id ? { id: props.id } : {})}
        disabled={props.disabled}
        aria-label={props["aria-label"]}
        aria-invalid={props.invalido || undefined}
        aria-haspopup="dialog"
        aria-expanded={false}
        onClick={props.onActivar}
        className={cn(claseControl, "text-left")}
      >
        <Search className="size-4 flex-none text-fg-subtle" aria-hidden />
        <span
          className={cn("min-w-0 flex-1 truncate", (multiple || !elegidos[0]) && "text-fg-subtle")}
        >
          {!multiple && elegidos[0] ? etiquetaDe(elegidos[0]) : (props.placeholder ?? "Elegir…")}
        </span>
        <ChevronsUpDown className="size-4 flex-none text-fg-subtle" aria-hidden />
      </button>
    </>
  );
}

/**
 * Select con búsqueda para listas largas (cmdk sobre Popover de Radix) con carga diferida: hasta
 * el primer clic solo existe el disparador; luego se monta abierto.
 */
export function Combobox(props: ComboboxProps) {
  const [activo, setActivo] = useState(false);
  if (!activo) return <Disparador {...props} onActivar={() => setActivo(true)} />;
  return (
    <Suspense fallback={<Disparador {...props} />}>
      <ComboboxCmdk {...props} abiertoInicial />
    </Suspense>
  );
}
