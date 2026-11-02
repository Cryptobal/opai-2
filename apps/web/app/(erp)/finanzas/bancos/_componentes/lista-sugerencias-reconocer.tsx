import { Badge, Button } from "@opai/ds";

export type SugerenciaReconocer = {
  documentoId: string;
  tipo: "documento_emitido" | "documento_recibido";
  nivel: string;
  confianza: number;
  motivo: string;
  montoDocumento: number;
  montoPendiente: number;
  diferencia: number;
};

export function ListaSugerenciasReconocer({
  sugerencias,
  pendiente,
  onElegir,
}: {
  sugerencias: SugerenciaReconocer[];
  pendiente: boolean;
  onElegir: (s: SugerenciaReconocer) => void;
}) {
  if (sugerencias.length === 0) {
    return <p className="t-body-sm text-muted">Sin sugerencias automáticas para este movimiento.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {sugerencias.map((s) => (
        <li key={s.documentoId} className="rowcard flex flex-wrap items-center gap-2 p-3">
          <div className="min-w-0 flex-1">
            <p className="t-body-sm font-medium">Documento {s.documentoId.slice(0, 8)}…</p>
            <p className="t-caption text-muted">{s.motivo}</p>
          </div>
          <Badge tono="neutro">{s.nivel}</Badge>
          <Button
            variant="secondary"
            disabled={pendiente}
            onClick={() => onElegir(s)}
          >
            Elegir
          </Button>
        </li>
      ))}
    </ul>
  );
}
