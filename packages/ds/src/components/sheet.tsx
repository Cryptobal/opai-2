"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "../cn";
import { Button } from "./button";

type SheetProps = {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  acciones?: ReactNode;
};

/**
 * Panel modal sobre <dialog> nativo: inferior con asa en teléfono, lateral derecho en md+.
 * Única superficie con sombra (overlay) y scrim.
 */
export function Sheet({ abierto, onCerrar, titulo, children, acciones }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (abierto && !el.open) el.showModal();
    if (!abierto && el.open) el.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      onClick={(e) => e.target === ref.current && onCerrar()}
      className={cn(
        "m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-scrim",
        "open:flex open:flex-col open:justify-end md:open:flex-row md:open:justify-end",
      )}
    >
      <div
        className={cn(
          "flex max-h-[90dvh] w-full flex-col rounded-t-xl bg-surface-raised shadow-overlay",
          "md:h-dvh md:max-h-none md:w-[420px] md:rounded-none md:rounded-l-lg",
        )}
      >
        <div
          aria-hidden
          className="mx-auto mt-2 h-[5px] w-9 rounded-full bg-border-strong md:hidden"
        />
        <header className="flex items-center justify-between gap-3 px-4 py-3">
          <h2 className="t-subheading text-fg">{titulo}</h2>
          <Button variant="ghost" size="icon" aria-label="Cerrar" onClick={onCerrar}>
            <X className="size-5" />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        {acciones ? (
          <footer className="flex gap-2 border-t border-border px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
            {acciones}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
