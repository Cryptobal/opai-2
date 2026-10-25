"use client";

import { ChevronDown, ChevronsUpDown, LayoutGrid } from "lucide-react";

import { cn } from "../cn";
import { Monograma } from "../components/avatar";
import { type ItemMenu, Menu } from "../components/menu";
import type { Portal, Tenant } from "./types";

type Props = {
  portales: readonly Portal[];
  portalActual: string;
  tenant?: Tenant | undefined;
  /** `compacto`: monograma, empresa y portal (teléfono). `monograma`: solo el monograma (barra
   *  lateral). `riel`: monograma sobre el portal (abreviado) y ⇅, en un botón de 64 px (riel de iPad, ShellTablet). */
  variante?: "compacto" | "monograma" | "riel";
  /** Ítems extra al pie (cambiar de empresa). */
  extra?: readonly ItemMenu[] | undefined;
  className?: string;
};

/** Por variante: dónde abre el menú, la clase del disparador y la del bloque sin menú. */
const VARIANTES = {
  compacto: {
    lado: "abajo-izquierda",
    clase: "min-w-0 justify-start px-1",
    estatica: "flex min-h-11 min-w-0 items-center px-1",
  },
  monograma: {
    lado: "abajo-derecha",
    clase: "size-11",
    estatica: "flex min-h-11 min-w-0 items-center px-1",
  },
  riel: {
    lado: "derecha",
    clase: "h-16 w-16 flex-col gap-1 rounded-[12px] border border-border bg-bg px-0.5",
    estatica: "flex h-16 w-16 flex-col items-center justify-center gap-1 px-0.5",
  },
} as const;

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
  const conMenu = items.length > 1;
  const visual =
    variante === "monograma" ? (
      <Monograma nombre={nombre} className="size-6" />
    ) : variante === "riel" ? (
      <>
        <Monograma nombre={nombre} />
        <span className="flex max-w-full items-center gap-0.5 text-[11px] leading-[14px] font-semibold text-fg">
          <span className="truncate">{actual?.corta ?? actual?.etiqueta}</span>
          {conMenu ? <ChevronsUpDown className="size-3 flex-none" aria-hidden /> : null}
        </span>
      </>
    ) : (
      <span className="flex min-w-0 items-center gap-2">
        <Monograma nombre={nombre} />
        <span className="truncate text-[15px] leading-5 font-semibold text-fg">{nombre}</span>
        <span className="flex-none text-sm text-fg-muted">{actual?.etiqueta}</span>
        {conMenu ? <ChevronDown className="size-4 flex-none text-fg-subtle" aria-hidden /> : null}
      </span>
    );
  const v = VARIANTES[variante];
  if (!conMenu) {
    return (
      <span
        className={cn(v.estatica, props.className)}
        title={`${nombre} · ${actual?.etiqueta ?? ""}`}
      >
        {visual}
      </span>
    );
  }
  return (
    <Menu
      etiqueta={`${nombre} · portal ${actual?.etiqueta ?? ""}. Cambiar de portal o empresa`}
      {...(variante === "riel" ? { titulo: `${nombre} · ${actual?.etiqueta ?? ""}` } : {})}
      items={items}
      lado={v.lado}
      disparador={visual}
      {...(props.className ? { className: props.className } : {})}
      claseDisparador={v.clase}
    />
  );
}
