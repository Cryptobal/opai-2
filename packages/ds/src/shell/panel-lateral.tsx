"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

import { cn } from "../cn";
import { Button } from "../components/button";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  /** Acciones de la cabecera (menú «⋯»), a la izquierda de «Cerrar». */
  acciones?: ReactNode;
  /** Con un plan pendiente, tocar fuera (scrim) y Escape no cierran el panel. */
  retener?: boolean;
  children: ReactNode;
};

const ANCHO = "400px";
const XL = "(min-width: 1280px)";

/**
 * Panel lateral (agente interno, CAR-120): pantalla completa en teléfono, superpuesto bajo la barra
 * superior con scrim suave en iPad, y acoplado sin scrim en escritorio ≥ 1280 px, donde el contenido
 * se reacomoda (la variable `--panel-lateral` da el margen al `main` del `AppShell`). Escape lo cierra
 * y devuelve el foco a quien lo abrió.
 */
export function PanelLateral({ abierto, onCerrar, titulo, acciones, retener, children }: Props) {
  const origen = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLElement | null>(null);
  const alCerrar = useRef(onCerrar);
  alCerrar.current = onCerrar;
  const bloqueado = useRef(retener);
  bloqueado.current = retener;
  useEffect(() => {
    if (!abierto) return;
    origen.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.focus();
    const raiz = document.documentElement;
    const mq = window.matchMedia(XL);
    const ajustar = () =>
      mq.matches
        ? raiz.style.setProperty("--panel-lateral", ANCHO)
        : raiz.style.removeProperty("--panel-lateral");
    ajustar();
    mq.addEventListener("change", ajustar);
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented && !bloqueado.current) alCerrar.current();
    };
    document.addEventListener("keydown", tecla);
    return () => {
      mq.removeEventListener("change", ajustar);
      document.removeEventListener("keydown", tecla);
      raiz.style.removeProperty("--panel-lateral");
      origen.current?.focus();
    };
  }, [abierto]);
  if (!abierto) return null;
  return (
    <>
      <div
        aria-hidden
        className="fixed inset-x-0 top-[60px] bottom-0 z-40 hidden bg-fg/10 md:block xl:hidden"
        onClick={() => {
          if (!retener) onCerrar();
        }}
      />
      <aside
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-label={titulo}
        className={cn(
          "pt-safe fixed inset-0 z-50 flex flex-col bg-bg outline-none",
          "md:inset-y-auto md:top-[60px] md:right-0 md:bottom-0 md:left-auto md:w-[400px] md:border-l md:border-border md:pt-0 md:shadow-overlay",
          "animate-[ds-aparecer_150ms_ease-out] motion-reduce:animate-none",
        )}
      >
        <header className="flex h-[52px] flex-none items-center gap-1 border-b border-border px-2 md:h-14 md:px-3">
          <h2 className="t-title min-w-0 flex-1 truncate px-1 text-fg">{titulo}</h2>
          {acciones}
          <Button variant="ghost" aria-label="Cerrar" className="size-11 p-0" onClick={onCerrar}>
            <X className="size-5" aria-hidden />
          </Button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </aside>
    </>
  );
}
