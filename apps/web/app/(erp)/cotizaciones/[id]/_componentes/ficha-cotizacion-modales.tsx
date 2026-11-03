"use client";

import { useState } from "react";

import { HojaAgregarPuesto } from "./hoja-agregar-puesto";
import { HojaEditarPuesto } from "./hoja-editar-puesto";
import { HojaTrazaCalculo } from "./hoja-traza-calculo";
import { DialogoEnviarCotizacionLazy, DialogoVistaPreviaPdfLazy } from "./ficha-cotizacion-modales-lazy";

export function useModalesFichaCotizacion() {
  const [hojaSeccion, setHojaSeccion] = useState<string | null>(null);
  const [lineaEditar, setLineaEditar] = useState<{
    id: string;
    nombre: string;
    posiciones?: number;
    sueldoBaseClp?: number;
  } | null>(null);
  const [trazaAbierta, setTrazaAbierta] = useState<{ titulo: string; traza: Record<string, unknown>[] } | null>(
    null,
  );
  const [enviarAbierto, setEnviarAbierto] = useState(false);
  const [previewAbierto, setPreviewAbierto] = useState(false);
  type LineaEditable = { id: string; nombre: string; posiciones?: number; sueldoBaseClp?: number };
  /** Abre la hoja de edición de la línea del aviso de sueldo faltante (CAR-162), sin navegar. */
  function editarLineaDe(secciones: readonly { lineas: readonly LineaEditable[] }[], lineaId: string) {
    const l = secciones.flatMap((s) => s.lineas).find((x) => x.id === lineaId);
    if (!l) return;
    setLineaEditar({
      id: l.id,
      nombre: l.nombre,
      ...(l.posiciones !== undefined ? { posiciones: l.posiciones } : {}),
      ...(l.sueldoBaseClp !== undefined ? { sueldoBaseClp: l.sueldoBaseClp } : {}),
    });
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
  requiereAprobacion: boolean;
  estadoVersion: string;
  enviada: boolean;
  recargar: () => void;
}) {
  const m = p.modales;
  return (
    <>
      {m.hojaSeccion ? (
        <HojaAgregarPuesto seccionId={m.hojaSeccion} onCerrar={() => m.setHojaSeccion(null)} onCreado={p.recargar} />
      ) : null}
      {m.lineaEditar ? (
        <HojaEditarPuesto linea={m.lineaEditar} onCerrar={() => m.setLineaEditar(null)} onGuardado={p.recargar} />
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
