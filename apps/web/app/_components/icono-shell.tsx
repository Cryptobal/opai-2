import { LayoutGrid, type LucideIcon, type LucideProps } from "lucide-react";
import { cloneElement, forwardRef, isValidElement, type ReactNode } from "react";

/** Los SVG estáticos llegan del servidor; no descargamos el catálogo de iconos con cada portal. */
export function iconoShell(nombre: string, iconos: Record<string, ReactNode> = {}): LucideIcon {
  const svg = iconos[nombre];
  const Icono = forwardRef<SVGSVGElement, LucideProps>((props, ref) =>
    isValidElement<LucideProps>(svg) ? cloneElement(svg, { ...props, ref }) : <LayoutGrid {...props} ref={ref} />,
  );
  Icono.displayName = `IconoShell(${nombre})`;
  return Icono;
}
