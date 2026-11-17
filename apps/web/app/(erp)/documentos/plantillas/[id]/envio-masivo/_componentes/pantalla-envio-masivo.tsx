"use client";

import { Alerta, Button } from "@opai/ds";

import { VistaGenerar } from "@/app/_components/documentos/generar-entidad/vista-generar";

import { ConfirmarLoteSheet } from "./confirmar-lote-sheet";
import { FiltrosEnvioMasivo } from "./filtros-envio-masivo";
import { ListaCandidatasMasivo } from "./lista-candidatas-masivo";
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
      <p className="t-body text-fg-muted">
        Plantilla <span className="font-medium text-fg">{plantillaNombre}</span> · elige personas por
        instalación o cargo y envía el mismo documento a firmar en una sola operación.
      </p>
      {s.error ? <Alerta tono="danger" titulo="No se pudo completar">{s.error}</Alerta> : null}
      {s.resumen ? <Alerta tono="success" titulo="Lote procesado">{s.resumen}</Alerta> : null}
      <FiltrosEnvioMasivo
        filtros={s.filtros}
        instalaciones={instalaciones}
        cargos={cargos}
        pendiente={s.pendiente}
        onCambiar={s.setFiltros}
        onBuscar={() => void s.cargar()}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ListaCandidatasMasivo
          candidatas={s.candidatas}
          seleccion={s.seleccion}
          elegidas={s.elegidas.length}
          onToggle={s.toggleSeleccion}
          onPrevisualizar={(id) => void s.previsualizar(id)}
        />
        <div className="min-w-0">
          {s.vista ? (
            <VistaGenerar
              vista={s.vista}
              fichaHref={`/personas/${s.vista.persona.id}`}
              documentosHref={`/personas/${s.vista.persona.id}/documentos`}
            />
          ) : (
            <Alerta tono="info" titulo="Vista previa">
              Elige una persona de la lista para ver cómo quedaría su documento.
            </Alerta>
          )}
        </div>
      </div>
      <h3 className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <span className="t-body-sm text-fg-muted">
          Se generarán y enviarán a firma {s.elegidas.length} documento{s.elegidas.length === 1 ? "" : "s"}.
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={s.pendiente || s.elegidas.length === 0}
            onClick={() => void s.enviar(true)}
          >
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