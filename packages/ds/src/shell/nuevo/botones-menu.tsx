import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

const ESTILO =
  "-mr-1 hidden size-9 items-center justify-center rounded-md text-fg-muted hover:bg-fill focus-visible:outline-2 focus-visible:outline-focus lg:flex";

/** Cabecera del menú lateral fijo, en escritorio: lo oculta y deja el riel de íconos. */
export function BotonPlegarMenu({ onPlegar }: { onPlegar: () => void }) {
  return (
    <button
      type="button"
      onClick={onPlegar}
      aria-label="Ocultar el menú"
      title="Ocultar el menú"
      className={ESTILO}
    >
      <PanelLeftClose className="size-[18px]" aria-hidden />
    </button>
  );
}

/** Arriba del riel y del menú asomado, en escritorio: vuelve a dejar el menú lateral abierto. */
export function BotonFijarMenu({ onFijar }: { onFijar: () => void }) {
  return (
    <button
      type="button"
      onClick={onFijar}
      aria-label="Dejar el menú fijo"
      title="Dejar el menú fijo"
      className={ESTILO}
    >
      <PanelLeftOpen className="size-[18px]" aria-hidden />
    </button>
  );
}
