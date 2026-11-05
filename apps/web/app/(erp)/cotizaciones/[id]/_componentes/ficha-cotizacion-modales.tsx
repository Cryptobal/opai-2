"use client";

import { useState } from "react";

import { margenPctTexto } from "@/lib/cpq-presentacion";

import type { DatosFichaCotizacion } from "../../_componentes/datos";
import type { LineaEditable } from "../../_componentes/puesto-tipos";
import { HojaPuesto } from "./hoja-puesto";
import { HojaTrazaCalculo } from "./hoja-traza-calculo";
import { DialogoVistaPreviaPdfLazy, HojaEnviarCotizacionLazy, HojaMargenFinanzasLazy } from "./ficha-cotizacion-modales-lazy";
import type { MetaFicha } from "./meta-ficha";

export function useModalesFichaCotizacion() {
  const [hojaSeccion, setHojaSeccion] = useState<string | null>(null);
  const [lineaEditar, setLineaEditar] = useState<LineaEditable | null>(null);
  const [trazaAbierta, setTrazaAbierta] = useState<{ titulo: string; traza: Record<string, unknown>[] } | null>(
    null,
  );
  const [enviarAbierto, setEnviarAbierto] = useState(false);
  const [previewAbierto, setPreviewAbierto] = useState(false);
  const [margenAbierto, setMargenAbierto] = useState(false);
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
    margenAbierto,
    setMargenAbierto,
  };
}

export type ModalesFichaCotizacion = ReturnType<typeof useModalesFichaCotizacion>;

type Ficha = NonNullable<DatosFichaCotizacion["ficha"]>;

export function FichaCotizacionModales(p: {
  modales: ModalesFichaCotizacion;
  d: Ficha;
  calculo: { requiereAprobacion?: boolean; margenEfectivoPct?: number; ventaMensual?: number | null };
  meta: MetaFicha | undefined;
  verCostos: boolean;
  recargar: () => void;
}) {
  const { d, calculo: c } = p;
  const enviada = d.version.estado === "enviada" || d.version.estado === "aceptada";
  const cotizacionId = d.cotizacion.id;
  const codigo = d.cotizacion.codigo;
  const versionNumero = d.version.numero;
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
        <HojaEnviarCotizacionLazy
          cotizacionId={cotizacionId}
          codigo={codigo}
          version={versionNumero}
          cuentaId={d.cuentaId}
          negocioId={d.cotizacion.negocioId}
          requiereAprobacion={Boolean(c.requiereAprobacion)}
          requiereMutual={Boolean(p.meta?.requiereConfirmarMutual)}
          margenTexto={p.verCostos ? margenPctTexto(c.margenEfectivoPct) : null}
          estado={d.version.estado}
          onCerrar={() => m.setEnviarAbierto(false)}
          onEnviado={p.recargar}
        />
      ) : null}
      {m.margenAbierto && p.verCostos && d.parametros ? (
        <HojaMargenFinanzasLazy
          versionId={d.version.id}
          parametros={d.parametros}
          ventaActual={c.ventaMensual ?? null}
          onCerrar={() => m.setMargenAbierto(false)}
          onListo={p.recargar}
        />
      ) : null}
      {m.previewAbierto ? (
        <DialogoVistaPreviaPdfLazy
          cotizacionId={cotizacionId}
          codigo={codigo}
          version={versionNumero}
          enviada={enviada}
          onCerrar={() => m.setPreviewAbierto(false)}
        />
      ) : null}
    </>
  );
}
