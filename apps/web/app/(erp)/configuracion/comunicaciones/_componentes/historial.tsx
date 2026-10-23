import { Badge, SeccionTarjeta } from "@opai/ds";

import { fecha } from "@/lib/fechas";

import { Restablecer } from "./acciones-plantilla";
import type { Plantillas } from "./tipos";

type Props = { t: Plantillas; evento: string; canal: string; asunto: string; cuerpo: string };

/** Historial de versiones publicadas (31) y vuelta a la plantilla de OPAI. */
export function Historial({ t, evento, canal, asunto, cuerpo }: Props) {
  return (
    <SeccionTarjeta
      titulo="Historial de versiones"
      accion={
        t.vigente?.version ? (
          <Restablecer
            evento={evento}
            canal={canal}
            asunto={asunto || "-"}
            cuerpo={cuerpo || "-"}
          />
        ) : null
      }
      sinRelleno
    >
      <ul>
        {t.versiones.map((v) => (
          <li
            key={v.version}
            className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
          >
            <span className="text-base text-fg">
              Versión {v.version} {v.activa ? <Badge tono="success">publicada</Badge> : null}
            </span>
            <span className="t-caption">{fecha(v.creadaEn)}</span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-base text-fg-muted">
            Plantilla de OPAI {t.vigente?.version ? null : <Badge tono="success">en uso</Badge>}
          </span>
        </li>
      </ul>
    </SeccionTarjeta>
  );
}
