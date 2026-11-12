import { WifiOff } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../cn";

type Props = { titulo?: string; descripcion?: string; accion?: ReactNode; className?: string };

/**
 * Sin conexión (PWA, ADR-044): no hay red; el contenido vuelve al reconectar. En su propio módulo
 * para que `WifiOff` no entre en el chunk compartido de los estados (Loading/Empty/…) ni pese en el
 * primer JS de rutas que no lo usan (ADR-037).
 */
export function SinConexion(props: Props) {
  return (
    <div
      role="status"
      className={cn("ds-estado", props.className)}
    >
      <div className="ds-estado-icono">
        <WifiOff />
      </div>
      <p className="ds-estado-titulo">{props.titulo ?? "Sin conexión"}</p>
      <p className="ds-estado-texto">
        {props.descripcion ??
          "No hay red en este momento. Revisa tu conexión; el contenido vuelve al reconectar."}
      </p>
      {props.accion ? <div className="mt-1">{props.accion}</div> : null}
    </div>
  );
}
