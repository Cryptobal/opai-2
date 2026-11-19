"use client";

import { Button } from "@opai/ds";

import { ConfirmarLoteSheet } from "./confirmar-lote-sheet";
import { CuerpoEnvioMasivo } from "./cuerpo-envio-masivo";
import { useEnvioMasivo } from "./use-envio-masivo";

type Props = {
  plantillaId: string;
  plantillaNombre: string;
  instalaciones: { id: string; nombre: string }[];
  cargos: { id: string; nombre: string }[];
};

export function PantallaEnvioMasivo({ plantillaId, plantillaNombre, instalaciones, cargos }: Props) {
  const s = useEnvioMasivo(plantillaId);
  return (
    <div className="flex flex-col gap-6">
      <CuerpoEnvioMasivo
        plantillaNombre={plantillaNombre}
        instalaciones={instalaciones}
        cargos={cargos}
        error={s.error}
        resumen={s.resumen}
        pendiente={s.pendiente}
        filtros={s.filtros}
        onFiltros={s.setFiltros}
        onBuscar={() => void s.cargar()}
        candidatas={s.candidatas}
        seleccion={s.seleccion}
        elegidas={s.elegidas.length}
        vista={s.vista}
        onToggle={s.toggleSeleccion}
        onPrevisualizar={(id) => void s.previsualizar(id)}
      />
      <h3 className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <span className="t-body-sm text-fg-muted">
          Se generarán y enviarán a firma {s.elegidas.length} documento{s.elegidas.length === 1 ? "" : "s"}.
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={s.pendiente || s.elegidas.length === 0} onClick={() => void s.enviar(true)}>
            Vista previa del lote
          </Button>
          <Button disabled={s.pendiente || s.elegidas.length === 0} onClick={() => void s.enviar(false)}>
            {s.pendiente ? "Procesando…" : `Enviar ${s.elegidas.length || ""} a firma`}
          </Button>
        </div>
      </h3>
      <ConfirmarLoteSheet
        abierto={s.confirmar}
        cantidad={s.elegidas.length}
        pendiente={s.pendiente}
        onCerrar={() => s.setConfirmar(false)}
        onConfirmar={() => void s.enviar(false)}
      />
    </div>
  );
}