"use client";

import { Alerta } from "@opai/ds";

import { VistaGenerar } from "@/app/_components/documentos/generar-entidad/vista-generar";
import type { VistaRellenoPersona } from "@/app/_components/documentos/generar-entidad/tipos";

import { FiltrosEnvioMasivo, type FiltrosEnvioMasivo as Filtros } from "./filtros-envio-masivo";
import { ListaCandidatasMasivo, type CandidataMasivo } from "./lista-candidatas-masivo";

type Props = {
  plantillaNombre: string;
  instalaciones: { id: string; nombre: string }[];
  cargos: { id: string; nombre: string }[];
  error: string | null;
  resumen: string | null;
  pendiente: boolean;
  filtros: Filtros;
  onFiltros: (f: Filtros) => void;
  onBuscar: () => void;
  candidatas: CandidataMasivo[];
  seleccion: Set<string>;
  elegidas: number;
  vista: VistaRellenoPersona | null;
  onToggle: (id: string, v: boolean) => void;
  onPrevisualizar: (id: string) => void;
};

export function CuerpoEnvioMasivo(p: Props) {
  return (
    <>
      <p className="t-body text-fg-muted">
        Plantilla <span className="font-medium text-fg">{p.plantillaNombre}</span> · elige personas por
        instalación o cargo y envía el mismo documento a firmar en una sola operación.
      </p>
      {p.error ? <Alerta tono="danger" titulo="No se pudo completar">{p.error}</Alerta> : null}
      {p.resumen ? <Alerta tono="success" titulo="Lote procesado">{p.resumen}</Alerta> : null}
      <FiltrosEnvioMasivo
        filtros={p.filtros}
        instalaciones={p.instalaciones}
        cargos={p.cargos}
        pendiente={p.pendiente}
        onCambiar={p.onFiltros}
        onBuscar={p.onBuscar}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ListaCandidatasMasivo
          candidatas={p.candidatas}
          seleccion={p.seleccion}
          elegidas={p.elegidas}
          onToggle={p.onToggle}
          onPrevisualizar={p.onPrevisualizar}
        />
        <div className="min-w-0">
          {p.vista ? (
            <VistaGenerar
              vista={p.vista}
              fichaHref={`/personas/${p.vista.persona.id}`}
              documentosHref={`/personas/${p.vista.persona.id}/documentos`}
            />
          ) : (
            <Alerta tono="info" titulo="Vista previa">
              Elige una persona de la lista para ver cómo quedaría su documento.
            </Alerta>
          )}
        </div>
      </div>
    </>
  );
}