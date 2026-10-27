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
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center",
        props.className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-bg text-fg-muted">
        <WifiOff className="size-6" />
      </div>
      <p className="text-md font-medium text-fg">{props.titulo ?? "Sin conexión"}</p>
      <p className="max-w-sm text-base text-fg-muted">
        {props.descripcion ??
          "No hay red en este momento. Revisa tu conexión; el contenido vuelve al reconectar."}
      </p>
      {props.accion ? <div className="mt-1">{props.accion}</div> : null}
    </div>
  );
}
