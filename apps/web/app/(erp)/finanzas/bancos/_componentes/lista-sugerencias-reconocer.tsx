import { Badge, Button } from "@opai/ds";

import { clp } from "../../flujo/_componentes/datos";
import { deSugerencia, type Elegida } from "./seleccion-conciliacion";

export type SugerenciaReconocer = {
  documentoId: string;
  tipo: "documento_emitido" | "documento_recibido";
  nivel: string;
  confianza: number;
  motivo: string;
  montoDocumento: number;
  montoPendiente: number;
  diferencia: number;
  folio: number | null;
  tipoDte: number | null;
  contraparte: string | null;
};

export function ListaSugerenciasReconocer({
  sugerencias,
  elegidas,
  pendiente,
  onAgregar,
  onQuitar,
}: {
  sugerencias: SugerenciaReconocer[];
  elegidas: Elegida[];
  pendiente: boolean;
  onAgregar: (e: Elegida) => void;
  onQuitar: (id: string) => void;
}) {
  if (sugerencias.length === 0) {
    return <p className="t-body-sm text-fg-muted">Sin sugerencias automáticas para este movimiento.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {sugerencias.map((s) => {
        const e = deSugerencia(s);
        const elegida = elegidas.some((x) => x.id === s.documentoId);
        return (
          <li key={s.documentoId} className="rowcard flex flex-wrap items-center gap-2 p-3">
            <div className="min-w-0 flex-1">
              <p className="t-body-sm font-medium">{e.etiqueta}</p>
              <p className="t-caption text-fg-muted">
                Pendiente {clp(e.pendiente)} · {s.motivo}
              </p>
            </div>
            <Badge tono="neutro">{s.nivel}</Badge>
            <Button
              variant={elegida ? "ghost" : "secondary"}
              disabled={pendiente}
              onClick={() => (elegida ? onQuitar(s.documentoId) : onAgregar(e))}
            >
              {elegida ? "Quitar" : "Agregar"}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
