import type { ReactNode } from "react";
import { Badge } from "./badge";

export function VersionesVigencia({
  versiones,
}: {
  versiones: readonly {
    id: string;
    desde: string;
    hasta: string | null;
    estado: string;
    contenido: ReactNode;
  }[];
}) {
  return versiones.length ? (
    <ol aria-label="Versiones por vigencia" className="divide-y divide-border">
      {versiones.map((v) => (
        <li key={v.id} className="py-3">
          <details>
            <summary className="t-label flex min-h-11 cursor-pointer flex-wrap items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-accent">
              Desde {v.desde} · {v.hasta ? `hasta ${v.hasta}` : "sin término"}
              <Badge punto={false}>{v.estado}</Badge>
            </summary>
            {v.contenido}
          </details>
        </li>
      ))}
    </ol>
  ) : (
    <p className="t-body-sm">Aún no hay versiones.</p>
  );
}
