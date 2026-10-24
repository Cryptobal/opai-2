"use client";

import { ChevronDown, LayoutGrid } from "lucide-react";

import { cn } from "../cn";
import { Monograma } from "../components/avatar";
import { type ItemMenu, Menu } from "../components/menu";
import type { Portal, Tenant } from "./types";

type Props = {
  portales: readonly Portal[];
  portalActual: string;
  tenant?: Tenant | undefined;
  /** `compacto`: monograma, empresa y portal (teléfono). `monograma`: solo el monograma (barra
   *  lateral). `riel`: monograma sobre el portal, en un botón de 64 px (riel de iPad). */
  variante?: "compacto" | "monograma" | "riel";
  /** Ítems extra al pie (cambiar de empresa). */
  extra?: readonly ItemMenu[] | undefined;
  className?: string;
};

/** Selector de portal sobre `Menu` (Radix): el portal actual marcado; navega al inicio del elegido. */
export function PortalSwitcher(props: Props) {
  const { portales, portalActual, tenant, variante = "compacto", extra = [] } = props;
  const actual = portales.find((p) => p.id === portalActual) ?? portales[0];
  const nombre = tenant?.nombre ?? "OPAI";
  const items: ItemMenu[] = [
    ...portales.map((p, i) => ({
      id: `p-${p.id}`,
      ...(i === 0 ? { grupo: "Portal" } : {}),
      etiqueta: p.etiqueta,
      icono: LayoutGrid,
      marcado: p.id === actual?.id,
      onSelect: () => window.location.assign(p.href),
    })),
    ...extra,
  ];
  const visual =
    variante === "monograma" ? (
      <Monograma nombre={nombre} className="size-6" />
    ) : variante === "riel" ? (
      <>
        <Monograma nombre={nombre} />
        <span className="max-w-full truncate text-[11px] leading-[14px] font-semibold text-fg">
          {actual?.etiqueta}
        </span>
        {items.length > 1 ? (
          <ChevronDown className="absolute top-1 right-1 size-3 text-fg-subtle" aria-hidden />
        ) : null}
      </>
    ) : (
      <span className="flex min-w-0 items-center gap-2">
        <Monograma nombre={nombre} />
        <span className="truncate text-[15px] leading-5 font-semibold text-fg">{nombre}</span>
        <span className="flex-none text-sm text-fg-muted">{actual?.etiqueta}</span>
        {items.length > 1 ? (
          <ChevronDown className="size-4 flex-none text-fg-subtle" aria-hidden />
        ) : null}
      </span>
    );
  if (items.length <= 1) {
    return (
      <span
        className={cn("flex min-h-11 min-w-0 items-center px-1", props.className)}
        title={nombre}
      >
        {visual}
      </span>
    );
  }
  return (
    <Menu
      etiqueta={`${nombre} · portal ${actual?.etiqueta ?? ""}. Cambiar de portal o empresa`}
      items={items}
      lado={
        variante === "monograma"
          ? "abajo-derecha"
          : variante === "riel"
            ? "derecha-inicio"
            : "abajo-izquierda"
      }
      disparador={visual}
      {...(props.className ? { className: props.className } : {})}
      claseDisparador={
        variante === "monograma"
          ? "size-11"
          : variante === "riel"
            ? "relative h-16 w-16 flex-col gap-1 border border-border bg-bg px-0.5"
            : "min-w-0 justify-start px-1"
      }
    />
  );
}
