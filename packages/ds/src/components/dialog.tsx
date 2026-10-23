"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "../cn";

type DialogProps = {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  children?: ReactNode;
  /** Botones al pie: en teléfono apilados a ancho completo, en md+ a la derecha. */
  acciones?: ReactNode;
  className?: string;
};

/**
 * Diálogo modal centrado sobre <dialog> nativo (foco atrapado, Escape cierra). Para confirmaciones
 * y para mostrar un dato una sola vez (secreto de API key). Formularios largos van en `Sheet`.
 */
export function Dialog({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  children,
  acciones,
  className,
}: DialogProps) {
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
      aria-labelledby="ds-dialog-titulo"
      className={cn(
        "m-auto w-[calc(100%-32px)] max-w-[440px] rounded-lg bg-surface-raised p-0 text-fg shadow-overlay backdrop:bg-scrim",
        className,
      )}
    >
      <div className="flex flex-col gap-2 px-5 pt-5">
        <h2 id="ds-dialog-titulo" className="t-subheading text-fg">
          {titulo}
        </h2>
        {descripcion ? <p className="text-base text-fg-muted">{descripcion}</p> : null}
      </div>
      {children ? <div className="px-5 pt-3">{children}</div> : null}
      {acciones ? (
        <footer className="flex flex-col-reverse gap-2 px-5 pt-5 pb-5 md:flex-row md:justify-end [&>*]:h-12 md:[&>*]:h-10">
          {acciones}
        </footer>
      ) : (
        <div className="h-5" />
      )}
    </dialog>
  );
}
