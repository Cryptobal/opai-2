import { Alerta, Campo, Input } from "@opai/ds";

import type { MovimientoBanco } from "./bancos-tipos";
import { ListaSugerenciasReconocer, type SugerenciaReconocer } from "./lista-sugerencias-reconocer";

export function CuerpoHojaReconocer({
  movimiento,
  esConciliado,
  error,
  sugerencias,
  pendiente,
  docManual,
  onDocManual,
  onElegirSugerencia,
}: {
  movimiento: MovimientoBanco;
  esConciliado: boolean;
  error: string | null;
  sugerencias: SugerenciaReconocer[];
  pendiente: boolean;
  docManual: string;
  onDocManual: (v: string) => void;
  onElegirSugerencia: (s: SugerenciaReconocer) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <p className="t-caption text-muted">
        {movimiento.fecha}
        {movimiento.referencia ? ` · Ref. ${movimiento.referencia}` : ""}
      </p>
      {esConciliado ? (
        <Alerta tono="success" titulo="Movimiento conciliado">
          Puedes deshacer la conciliación; el cobro en ventas se revierte.
        </Alerta>
      ) : (
        <>
          <Alerta tono="info" titulo="Es una sugerencia">
            No marca la factura como pagada hasta que confirmes.
          </Alerta>
          <ListaSugerenciasReconocer
            sugerencias={sugerencias}
            pendiente={pendiente}
            onElegir={onElegirSugerencia}
          />
          <Campo etiqueta="Otro documento (UUID)" htmlFor="banco-doc-manual">
            <Input
              id="banco-doc-manual"
              value={docManual}
              onChange={(e) => onDocManual(e.target.value)}
              placeholder="ID del DTE emitido"
            />
          </Campo>
        </>
      )}
    </div>
  );
}
