"use client";

import { Command } from "cmdk";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { Popover as RadixPopover } from "radix-ui";
import { useEffect, useState } from "react";

import { cn } from "../cn";
import { Chip } from "./chip";
import { claseOverlay } from "./menu";
import { claseControl } from "./select";

export type OpcionCombobox = { valor: string; etiqueta: string; detalle?: string };

type Props = {
  id?: string;
  opciones: readonly OpcionCombobox[];
  /** Selección única (`valor`) o múltiple (`valores`, con chips). */
  valor?: string | null;
  valores?: readonly string[];
  onCambiar: (valores: string[]) => void;
  /** Búsqueda remota (direcciones, cuentas): reemplaza el filtro local. */
  onBuscar?: (q: string) => Promise<readonly OpcionCombobox[]>;
  /** Permite crear una opción con el texto escrito ("Crear “…”"). */
  onCrear?: (texto: string) => void;
  placeholder?: string;
  buscarPlaceholder?: string;
  disabled?: boolean;
  invalido?: boolean;
  "aria-label"?: string;
};

/** Resalta en negrita la parte que coincide con la búsqueda. */
export function Resaltado({ texto, q }: { texto: string; q: string }) {
  const i = q ? texto.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, i)}
      <b className="font-semibold">{texto.slice(i, i + q.length)}</b>
      {texto.slice(i + q.length)}
    </>
  );
}

function useRemotas(q: string, onBuscar: Props["onBuscar"]) {
  const [remotas, setRemotas] = useState<readonly OpcionCombobox[] | null>(null);
  useEffect(() => {
    if (!onBuscar) return;
    let vigente = true;
    const t = setTimeout(() => void onBuscar(q).then((r) => vigente && setRemotas(r)), 220);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [q, onBuscar]);
  return remotas;
}

/** Select con búsqueda para listas largas (cmdk sobre Popover de Radix); crear y selección múltiple. */
export function Combobox(props: Props) {
  const { opciones, onCambiar, onBuscar, onCrear, placeholder = "Elegir…" } = props;
  const multiple = props.valores !== undefined;
  const elegidos = multiple ? [...(props.valores ?? [])] : props.valor ? [props.valor] : [];
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const remotas = useRemotas(q, onBuscar);
  const lista = onBuscar ? (remotas ?? []) : opciones;
  const etiquetaDe = (v: string) =>
    [...opciones, ...lista].find((o) => o.valor === v)?.etiqueta ?? v;
  const elegir = (v: string) => {
    if (!multiple) {
      onCambiar([v]);
      setAbierto(false);
      return;
    }
    onCambiar(elegidos.includes(v) ? elegidos.filter((x) => x !== v) : [...elegidos, v]);
  };
  const exacta = lista.some((o) => o.etiqueta.toLowerCase() === q.trim().toLowerCase());
  return (
    <RadixPopover.Root open={abierto} onOpenChange={setAbierto}>
      {multiple && elegidos.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {elegidos.map((v) => (
            <Chip key={v} valor={etiquetaDe(v)} onQuitar={() => elegir(v)} />
          ))}
        </div>
      ) : null}
      <RadixPopover.Trigger
        {...(props.id ? { id: props.id } : {})}
        disabled={props.disabled}
        aria-label={props["aria-label"]}
        aria-invalid={props.invalido || undefined}
        className={cn(claseControl, "text-left")}
      >
        <Search className="size-4 flex-none text-fg-subtle" aria-hidden />
        <span
          className={cn("min-w-0 flex-1 truncate", (multiple || !elegidos[0]) && "text-fg-subtle")}
        >
          {!multiple && elegidos[0] ? etiquetaDe(elegidos[0]) : placeholder}
        </span>
        <ChevronsUpDown className="size-4 flex-none text-fg-subtle" aria-hidden />
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align="start"
          sideOffset={4}
          className={cn(
            claseOverlay,
            "w-[var(--radix-popover-trigger-width)] min-w-64 overflow-hidden",
          )}
        >
          <Command shouldFilter={!onBuscar} label={props["aria-label"] ?? placeholder}>
            <div className="flex h-11 items-center gap-2 border-b border-border px-3">
              <Search className="size-4 text-fg-subtle" aria-hidden />
              <Command.Input
                value={q}
                onValueChange={setQ}
                placeholder={props.buscarPlaceholder ?? "Buscar"}
                className="h-full min-w-0 flex-1 bg-transparent text-md text-fg outline-none placeholder:text-fg-subtle"
              />
            </div>
            <Command.List className="max-h-72 overflow-y-auto py-1">
              <Command.Empty className="px-3 py-3 text-base text-fg-muted">
                Sin resultados para “{q}”
              </Command.Empty>
              {lista.map((o) => (
                <Command.Item
                  key={o.valor}
                  value={`${o.etiqueta} ${o.detalle ?? ""} ${o.valor}`}
                  onSelect={() => elegir(o.valor)}
                  className="flex min-h-11 cursor-default items-center gap-2 px-3 text-md text-fg data-[selected=true]:bg-fill"
                >
                  <span className="min-w-0 flex-1 truncate">
                    <Resaltado texto={o.etiqueta} q={q} />
                  </span>
                  {o.detalle ? <span className="t-caption truncate">{o.detalle}</span> : null}
                  {elegidos.includes(o.valor) ? (
                    <Check className="size-4 flex-none text-accent" aria-label="elegido" />
                  ) : null}
                </Command.Item>
              ))}
              {onCrear && q.trim() && !exacta ? (
                <Command.Item
                  value={`__crear ${q}`}
                  onSelect={() => {
                    onCrear(q.trim());
                    setAbierto(false);
                  }}
                  className="flex min-h-11 cursor-default items-center gap-2 px-3 text-md font-medium text-accent data-[selected=true]:bg-fill"
                >
                  <Plus className="size-4" aria-hidden /> Crear “{q.trim()}”
                </Command.Item>
              ) : null}
            </Command.List>
          </Command>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
