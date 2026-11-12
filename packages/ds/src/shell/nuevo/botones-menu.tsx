import { PanelLeftOpen } from "lucide-react";

/**
 * Riel del diseño nuevo (ADR-109) con el menú plegado. `tapado`: el menú asomado lo cubre y se saca
 * del árbol de accesibilidad para no repetir «Principal».
 */
export type PlegableRiel = {
  plegado: boolean;
  tapado: boolean;
  onAsomar: () => void;
  onFijar: () => void;
};

/** Arriba del riel y del menú asomado, en escritorio: vuelve a dejar el menú lateral abierto. */
export function BotonFijarMenu({ onFijar }: { onFijar: () => void }) {
  return (
    <button
      type="button"
      onClick={onFijar}
      aria-label="Dejar el menú fijo"
      title="Dejar el menú fijo"
      className="hidden size-9 items-center justify-center rounded-md text-fg-muted hover:bg-fill focus-visible:outline-2 focus-visible:outline-focus lg:flex"
    >
      <PanelLeftOpen className="size-[18px]" aria-hidden />
    </button>
  );
}
