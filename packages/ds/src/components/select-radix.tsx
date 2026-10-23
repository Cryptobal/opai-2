"use client";

import { Check, ChevronDown } from "lucide-react";
import { Select as RadixSelect } from "radix-ui";

import { cn } from "../cn";
import { claseOverlay } from "./menu";
import { claseControl, type SelectProps } from "./select";

/**
 * Lista desplegable para 2–12 opciones sobre Radix (ADR-017). Disparador de 44 px igual que `Input`;
 * panel con radio 10, sombra de overlay e ítems de 44 px con marca de selección.
 */
export function SelectRadix(props: SelectProps & { abiertoInicial?: boolean }) {
  const { id, valor, onCambiar, opciones, placeholder = "Elige una opción", disabled } = props;
  return (
    <RadixSelect.Root
      defaultOpen={props.abiertoInicial ?? false}
      {...(valor ? { value: valor } : { value: "" })}
      onValueChange={onCambiar}
      {...(disabled ? { disabled } : {})}
      {...(props.name ? { name: props.name } : {})}
    >
      <RadixSelect.Trigger
        {...(id ? { id } : {})}
        aria-label={props["aria-label"]}
        aria-invalid={props.invalido || undefined}
        className={cn(claseControl, "justify-between text-left", props.className)}
      >
        <span className="min-w-0 flex-1 truncate data-[placeholder]:text-fg-subtle">
          <RadixSelect.Value placeholder={<span className="text-fg-subtle">{placeholder}</span>} />
        </span>
        <RadixSelect.Icon>
          <ChevronDown className="size-4 text-fg-muted" aria-hidden />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className={cn(
            claseOverlay,
            "max-h-[min(360px,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] min-w-48 overflow-hidden",
          )}
        >
          <RadixSelect.Viewport className="py-1">
            {opciones.map((o) => (
              <RadixSelect.Item
                key={o.valor}
                value={o.valor}
                className="flex min-h-11 cursor-default items-center gap-2 px-3 text-md text-fg outline-none select-none data-[disabled]:opacity-45 data-[highlighted]:bg-fill"
              >
                <span className="min-w-0 flex-1">
                  <RadixSelect.ItemText>{o.etiqueta}</RadixSelect.ItemText>
                  {o.descripcion ? <span className="t-caption block">{o.descripcion}</span> : null}
                </span>
                <RadixSelect.ItemIndicator>
                  <Check className="size-4 text-accent" aria-hidden />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
