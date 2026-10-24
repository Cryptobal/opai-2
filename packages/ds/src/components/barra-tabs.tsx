import type { ReactNode } from "react";

import { RealceBarra } from "./realce-barra";

type Props = {
  /** Contenedor: `nav` (pestañas por ruta) o `div` con `role="tablist"` (pestañas con estado). */
  como: "nav" | "div";
  /** Id de la pestaña activa: al cambiar, la barra la desplaza hasta dejarla visible. */
  activa: string;
  etiqueta?: string;
  role?: "tablist";
  children: ReactNode;
};

/**
 * Barra de pestañas desplazable en horizontal (server-first). El eje vertical queda cerrado (ver
 * `estiloTab`: la rayita no sobresale). El degradado y el desplazamiento a la pestaña activa los
 * pone `RealceBarra`, que se descarga aparte y no pesa en el JS inicial de la ruta (ADR-037).
 */
export function BarraTabs({ como: Tag, activa, etiqueta, role, children }: Props) {
  return (
    <div className="-mx-4 min-w-0 md:mx-0">
      <Tag aria-label={etiqueta} role={role} className="ds-barra-tabs flex gap-1 px-4 md:px-0">
        {children}
      </Tag>
      <RealceBarra activa={activa} />
    </div>
  );
}
