"use client";

import { useState } from "react";

import type { LineaEditable } from "../../_componentes/puesto-tipos";
import { HojaPuesto } from "./hoja-puesto";
import { HojaTrazaCalculo } from "./hoja-traza-calculo";
import { DialogoEnviarCotizacionLazy, DialogoVistaPreviaPdfLazy } from "./ficha-cotizacion-modales-lazy";

export function useModalesFichaCotizacion() {
  const [hojaSeccion, setHojaSeccion] = useState<string | null>(null);
  const [lineaEditar, setLineaEditar] = useState<LineaEditable | null>(null);
  const [trazaAbierta, setTrazaAbierta] = useState<{ titulo: string; traza: Record<string, unknown>[] } | null>(
    null,
  );
  const [enviarAbierto, setEnviarAbierto] = useState(false);
  const [previewAbierto, setPreviewAbierto] = useState(false);
  /** Abre la hoja de edición de la línea del aviso de sueldo faltante (CAR-162), sin navegar. */
  function editarLineaDe(secciones: readonly { lineas: readonly LineaEditable[] }[], lineaId: string) {
    const l = secciones.flatMap((s) => s.lineas).find((x) => x.id === lineaId);
    if (!l) return;
    setLineaEditar(l);
  }
  return {
    editarLineaDe,
    hojaSeccion,
    setHojaSeccion,
    lineaEditar,
    setLineaEditar,
    trazaAbierta,
    setTrazaAbierta,
    enviarAbierto,
    setEnviarAbierto,
    previewAbierto,
    setPreviewAbierto,
  };
}

export type ModalesFichaCotizacion = ReturnType<typeof useModalesFichaCotizacion>;

export function FichaCotizacionModales(p: {
  modales: ModalesFichaCotizacion;
  cotizacionId: string;
  codigo: string;
  versionNumero: number;
  cuentaId: string | null;
  negocioId?: string | null;
  requiereAprobacion: boolean;
  estadoVersion: string;
  enviada: boolean;
  verCostos: boolean;
  recargar: () => void;
}) {
  const m = p.modales;
  return (
    <>
      {m.hojaSeccion ? (
        <HojaPuesto seccionId={m.hojaSeccion} verCostos={p.verCostos} onCerrar={() => m.setHojaSeccion(null)} onListo={p.recargar} />
      ) : null}
      {m.lineaEditar ? (
        <HojaPuesto linea={m.lineaEditar} verCostos={p.verCostos} onCerrar={() => m.setLineaEditar(null)} onListo={p.recargar} />
      ) : null}
      {m.trazaAbierta ? (
        <HojaTrazaCalculo
          titulo={m.trazaAbierta.titulo}
          traza={m.trazaAbierta.traza}
          onCerrar={() => m.setTrazaAbierta(null)}
        />
      ) : null}
      {m.enviarAbierto ? (
        <DialogoEnviarCotizacionLazy
          cotizacionId={p.cotizacionId}
          codigo={p.codigo}
          version={p.versionNumero}
          cuentaId={p.cuentaId}
          negocioId={p.negocioId ?? null}
          requiereAprobacion={p.requiereAprobacion}
          estado={p.estadoVersion}
          onCerrar={() => m.setEnviarAbierto(false)}
          onEnviado={p.recargar}
        />
      ) : null}
      {m.previewAbierto ? (
        <DialogoVistaPreviaPdfLazy
          cotizacionId={p.cotizacionId}
          codigo={p.codigo}
          version={p.versionNumero}
          enviada={p.enviada}
          onCerrar={() => m.setPreviewAbierto(false)}
        />
      ) : null}
    </>
  );
}
