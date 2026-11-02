import { LayoutGrid, type LucideIcon, type LucideProps } from "lucide-react";
import { cloneElement, forwardRef, isValidElement, type ReactNode } from "react";

/** Los SVG estáticos llegan del servidor; no descargamos el catálogo de iconos con cada portal. */
export function iconoShell(nombre: string, iconos: Record<string, ReactNode> = {}): LucideIcon {
  const svg = iconos[nombre];
  const Icono = forwardRef<SVGSVGElement, LucideProps>((props, ref) =>
    isValidElement<LucideProps>(svg) ? cloneElement(svg, { ...props, ref }) : svg ? (
      // RSC también transmite nodos diferidos: React los resuelve al abrir el menú.
      <svg {...props} ref={ref} viewBox="0 0 24 24">{svg}</svg>
    ) : <LayoutGrid {...props} ref={ref} />,
  );
  Icono.displayName = `IconoShell(${nombre})`;
  return Icono;
}
