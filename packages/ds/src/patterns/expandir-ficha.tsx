import { Maximize2, Minimize2 } from "lucide-react";

/**
 * «Ver a pantalla completa» de la ficha en una vista dividida (diseño nuevo, CAR-335 D4b). Es una
 * casilla oculta con su etiqueta: al marcarla, la lista se esconde y la ficha toma todo el ancho;
 * al desmarcarla, vuelve el 42/58. Sin JS (ADR-037): las reglas de `styles.css` leen
 * `:checked` con `:has()`. Solo se ve con el diseño nuevo desde 1024 px; el clásico no cambia.
 */
export function ExpandirFicha() {
  return (
    <div data-expandir-ficha="" className="hidden justify-end">
      <label className="relative flex size-11 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-fill">
        <input type="checkbox" data-expandir="" className="peer sr-only" />
        <span className="pointer-events-none absolute inset-0 rounded-md peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus" />
        <Maximize2 className="size-4 peer-checked:hidden" aria-hidden />
        <Minimize2 className="hidden size-4 peer-checked:block" aria-hidden />
        <span className="sr-only peer-checked:hidden">Ver a pantalla completa</span>
        <span className="sr-only hidden peer-checked:inline">Volver a ver la lista</span>
      </label>
    </div>
  );
}
