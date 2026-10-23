"use client";

import type { ReactNode } from "react";

import { cn } from "../cn";
import type { Portal } from "./types";

type TopBarProps = {
  titulo: string;
  portales: readonly Portal[];
  portalActual: string;
  usuario?: { nombre: string; iniciales: string };
  acciones?: ReactNode;
};

/** Barra superior mínima: título, selector de portal, usuario. Respeta el notch de iOS. */
export function TopBar({ titulo, portales, portalActual, usuario, acciones }: TopBarProps) {
  const actual = portales.find((p) => p.id === portalActual);
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-3 px-4 md:px-6 xl:px-8">
        <span className="font-semibold tracking-tight text-fg">OPAI</span>
        <label className="sr-only" htmlFor="selector-portal">
          Portal
        </label>
        <select
          id="selector-portal"
          value={actual?.id ?? portalActual}
          onChange={(e) => {
            const destino = portales.find((p) => p.id === e.target.value);
            if (destino) window.location.assign(destino.href);
          }}
          className={cn(
            "min-h-9 rounded-sm border border-border bg-surface px-2 text-sm text-fg-muted outline-none focus-visible:ring-2 focus-visible:ring-focus",
          )}
        >
          {portales.map((p) => (
            <option key={p.id} value={p.id}>
              {p.etiqueta}
            </option>
          ))}
        </select>
        <h1 className="ml-1 truncate text-base font-medium text-fg md:text-md">{titulo}</h1>
        <div className="ml-auto flex items-center gap-2">
          {acciones}
          {usuario ? (
            <span
              aria-label={usuario.nombre}
              title={usuario.nombre}
              className="flex size-9 items-center justify-center rounded-full bg-accent-muted text-sm font-medium text-accent"
            >
              {usuario.iniciales}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
