import { Alerta, Segmentado } from "@opai/ds";

import type { MovimientoBanco } from "./bancos-tipos";
import { BuscarFactura } from "./buscar-factura";
import { ListaSugerenciasReconocer, type SugerenciaReconocer } from "./lista-sugerencias-reconocer";
import { PanelFilaFlujo } from "./panel-fila-flujo";
import { PanelProrrateo } from "./panel-prorrateo";
import { conMontoInicial, type Elegida } from "./seleccion-conciliacion";
import type { useReconocerFila } from "./use-reconocer-fila";

export function CuerpoHojaReconocer({
  movimiento,
  esConciliado,
  error,
  sugerencias,
  pendiente,
  elegidas,
  onElegidas,
  fila,
}: {
  movimiento: MovimientoBanco;
  esConciliado: boolean;
  error: string | null;
  sugerencias: SugerenciaReconocer[];
  pendiente: boolean;
  elegidas: Elegida[];
  onElegidas: (e: Elegida[]) => void;
  fila: ReturnType<typeof useReconocerFila>;
}) {
  const agregar = (e: Elegida) =>
    onElegidas(conMontoInicial(elegidas, e, Math.abs(movimiento.monto)));
  return (
    <div className="flex flex-col gap-4">
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <p className="t-caption text-fg-muted">
        {movimiento.fecha}
        {movimiento.referencia ? ` · Ref. ${movimiento.referencia}` : ""}
      </p>
      {esConciliado ? null : (
        <Segmentado
          etiqueta="Conciliar contra"
          activa={fila.modo}
          opciones={[
            { id: "documentos", etiqueta: movimiento.monto > 0 ? "Facturas" : "Documentos", onClick: () => fila.setModo("documentos") },
            { id: "fila", etiqueta: "Fila del flujo", onClick: () => fila.setModo("fila") },
          ]}
        />
      )}
      {esConciliado ? (
        <Alerta tono="success" titulo="Movimiento conciliado">
          Puedes deshacer la conciliación; el cobro en ventas se revierte.
        </Alerta>
      ) : fila.modo === "fila" ? (
        <PanelFilaFlujo
          esAbono={movimiento.monto > 0}
          sinDestinos={fila.sinDestinos}
          onReintentar={fila.reintentar}
          destinos={fila.destinos}
          reglas={fila.reglas}
          eleccion={fila.eleccion}
          onEleccion={fila.setEleccion}
        />
      ) : (
        <>
          <Alerta tono="info" titulo="Un abono puede pagar varias facturas">
            Agrega los documentos y reparte el monto. No se marca nada como pagado hasta que
            confirmes.
          </Alerta>
          <ListaSugerenciasReconocer
            sugerencias={sugerencias}
            elegidas={elegidas}
            pendiente={pendiente}
            onAgregar={agregar}
            onQuitar={(id) => onElegidas(elegidas.filter((x) => x.id !== id))}
          />
          <BuscarFactura elegidas={elegidas} onAgregar={agregar} />
          <PanelProrrateo
            abono={Math.abs(movimiento.monto)}
            elegidas={elegidas}
            onCambiar={onElegidas}
          />
        </>
      )}
    </div>
  );
}
