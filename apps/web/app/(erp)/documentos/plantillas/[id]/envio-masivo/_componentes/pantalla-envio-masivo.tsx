"use client";

import { useCallback, useMemo, useState } from "react";

import type { ClasePlantilla } from "@opai/domain";
import { Alerta, Button } from "@opai/ds";

import { VistaGenerar } from "@/app/_components/documentos/generar-entidad/vista-generar";
import type { VistaRellenoPersona } from "@/app/_components/documentos/generar-entidad/tipos";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { avisarCambio } from "@/app/_components/ejecutar-capacidad";

import { ConfirmarLoteSheet } from "./confirmar-lote-sheet";
import { FiltrosEnvioMasivo, type FiltrosEnvioMasivo as Filtros } from "./filtros-envio-masivo";
import { ListaCandidatasMasivo, type CandidataMasivo } from "./lista-candidatas-masivo";

type Props = {
  plantillaId: string;
  plantillaNombre: string;
  clase?: ClasePlantilla;
  instalaciones: { id: string; nombre: string }[];
  cargos: { id: string; nombre: string }[];
};

export function PantallaEnvioMasivo({ plantillaId, plantillaNombre, instalaciones, cargos }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [filtros, setFiltros] = useState<Filtros>({ instalacionId: "", cargoId: "", anexoBorrador: false });
  const [candidatas, setCandidatas] = useState<CandidataMasivo[]>([]);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [vista, setVista] = useState<VistaRellenoPersona | null>(null);
  const [resumen, setResumen] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const clave = useMemo(() => crypto.randomUUID(), []);

  const cargar = useCallback(async () => {
    const r = await ejecutar<{ items: CandidataMasivo[] }>("core.documento_plantillas.candidatas", {
      plantillaId,
      ...(filtros.instalacionId ? { instalacionId: filtros.instalacionId } : {}),
      ...(filtros.cargoId ? { cargoId: filtros.cargoId } : {}),
      ...(filtros.anexoBorrador ? { anexoBorrador: true } : {}),
    });
    if (!r) return;
    setCandidatas(r.items);
    setSeleccion(new Set(r.items.filter((p) => p.puedeGenerar).map((p) => p.personaId)));
    setVista(null);
    setResumen(null);
  }, [ejecutar, plantillaId, filtros]);

  const elegidas = candidatas.filter((p) => seleccion.has(p.personaId) && p.puedeGenerar);

  async function previsualizar(personaId: string) {
    const r = await ejecutar<VistaRellenoPersona>("core.documento_plantillas.rellenar", {
      plantillaId,
      personaId,
    });
    if (r) setVista(r);
  }

  async function enviar(dryRun: boolean) {
    const ids = [...seleccion].filter((id) => candidatas.find((p) => p.personaId === id)?.puedeGenerar);
    if (!ids.length) return;
    const r = await ejecutar<{
      exitosas: number;
      fallidas: number;
      filas: { nombre: string; estado: string; mensaje: string | null }[];
    }>(
      "core.documento_plantillas.enviar_masivo",
      { plantillaId, personaIds: ids },
      dryRun,
      dryRun ? "ninguna" : "layout",
      dryRun ? undefined : clave,
    );
    if (!r) return;
    if (dryRun) {
      setConfirmar(true);
      return;
    }
    setConfirmar(false);
    setResumen(`${r.exitosas} enviadas · ${r.fallidas} con error`);
    avisarCambio();
    setCandidatas((prev) =>
      prev.map((p) => {
        const f = r.filas.find((x) => x.nombre === p.nombre);
        if (!f || f.estado === "ok") return p;
        return { ...p, puedeGenerar: false, motivoBloqueo: f.mensaje };
      }),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="t-body text-fg-muted">
        Plantilla <span className="font-medium text-fg">{plantillaNombre}</span> · elige personas por
        instalación o cargo y envía el mismo documento a firmar en una sola operación.
      </p>
      {error ? <Alerta tono="danger" titulo="No se pudo completar">{error}</Alerta> : null}
      {resumen ? <Alerta tono="success" titulo="Lote procesado">{resumen}</Alerta> : null}
      <FiltrosEnvioMasivo
        filtros={filtros}
        instalaciones={instalaciones}
        cargos={cargos}
        pendiente={pendiente}
        onCambiar={setFiltros}
        onBuscar={() => void cargar()}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ListaCandidatasMasivo
          candidatas={candidatas}
          seleccion={seleccion}
          elegidas={elegidas.length}
          onToggle={(id, v) => {
            setSeleccion((s) => {
              const n = new Set(s);
              if (v) n.add(id);
              else n.delete(id);
              return n;
            });
          }}
          onPrevisualizar={(id) => void previsualizar(id)}
        />
        <div className="min-w-0">
          {vista ? (
            <VistaGenerar
              vista={vista}
              fichaHref={`/personas/${vista.persona.id}`}
              documentosHref={`/personas/${vista.persona.id}/documentos`}
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
          Se generarán y enviarán a firma {elegidas.length} documento{elegidas.length === 1 ? "" : "s"}.
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={pendiente || elegidas.length === 0}
            onClick={() => void enviar(true)}
          >
            Vista previa del lote
          </Button>
          <Button disabled={pendiente || elegidas.length === 0} onClick={() => void enviar(false)}>
            {pendiente ? "Procesando…" : `Enviar ${elegidas.length || ""} a firma`}
          </Button>
        </div>
      </h3>
      <ConfirmarLoteSheet
        abierto={confirmar}
        cantidad={elegidas.length}
        pendiente={pendiente}
        onCerrar={() => setConfirmar(false)}
        onConfirmar={() => void enviar(false)}
      />
    </div>
  );
}