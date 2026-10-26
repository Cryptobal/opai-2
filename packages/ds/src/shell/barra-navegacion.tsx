import { cn } from "../cn";

/**
 * Indicador de navegación en curso (ADR-045): barra indeterminada de 2 px pegada al borde superior
 * de la cabecera. Es absoluta, así que no desplaza el grupo fijo ni cambia la altura de la barra
 * (CAR-12). Solo aparece mientras hay una navegación pendiente; con `prefers-reduced-motion` queda
 * una barra parcial estática.
 */
export function BarraNavegacion({ activa, className }: { activa: boolean; className?: string }) {
  if (!activa) return null;
  return (
    <div
      role="progressbar"
      aria-label="Cargando la página"
      className={cn("pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden", className)}
    >
      <div className="ds-nav-progreso h-full w-full origin-left bg-accent" />
    </div>
  );
}
