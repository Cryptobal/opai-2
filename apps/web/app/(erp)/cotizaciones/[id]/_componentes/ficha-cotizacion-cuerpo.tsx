"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import type { DatosFichaCotizacion } from "../../_componentes/datos";
import { FichaCotizacionLineas } from "./ficha-cotizacion-lineas";
import type { ModalesFichaCotizacion } from "./ficha-cotizacion-modales";
import { HistorialVersionesCpq, PanelDocumentoPdf } from "./historial-versiones";

const PropuestaTecnicaFicha = dynamic(
  () => import("./propuesta-tecnica-ficha").then((m) => m.PropuestaTecnicaFicha),
  { ssr: false, loading: () => null },
);

type Ficha = NonNullable<DatosFichaCotizacion["ficha"]>;
type MetaFicha = { puedeEnviar?: boolean };

export function FichaCotizacionCuerpo({
  d,
  datos,
  resumen,
  editable,
  pendiente,
  ejecutar,
  limpiarError,
  recargar,
  modales,
  meta,
}: {
  d: Ficha;
  datos: DatosFichaCotizacion;
  resumen: ReactNode;
  editable: boolean;
  pendiente: boolean;
  ejecutar: (id: string, input: unknown) => Promise<unknown | null>;
  limpiarError: () => void;
  recargar: () => void;
  modales: ModalesFichaCotizacion;
  meta?: MetaFicha;
}) {
  const metaEnvio = meta ?? (d.meta as MetaFicha | undefined);
  const puedeEnviar = Boolean(metaEnvio?.puedeEnviar ?? d.version.estado === "lista");
  return (
    <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4 min-w-0">
        <div className="xl:hidden">{resumen}</div>
        <FichaCotizacionLineas
          d={d}
          editable={editable}
          pendiente={pendiente}
          verCostos={datos.costos}
          onAgregar={modales.setHojaSeccion}
          onEditar={modales.setLineaEditar}
          onQuitar={(id) => void ejecutar("cpq.lineas.quitar", { id }).then((r) => r != null && recargar())}
          onTraza={(lineaId) => {
            limpiarError();
            const linea = d.secciones.flatMap((s) => s.lineas).find((l) => l.id === lineaId);
            void ejecutar("cpq.cotizaciones.explicar", { id: d.cotizacion.id, lineaId }).then((r) => {
              if (r && typeof r === "object" && "traza" in r) {
                modales.setTrazaAbierta({
                  titulo: `Traza · ${linea?.nombre ?? "línea"}`,
                  traza: (r as { traza: Record<string, unknown>[] }).traza,
                });
              }
            });
          }}
        />
        <PanelDocumentoPdf
          codigo={d.cotizacion.codigo}
          version={d.version.numero}
          estado={d.version.estado}
          onVistaPrevia={() => modales.setPreviewAbierto(true)}
        />
        <HistorialVersionesCpq versiones={datos.versiones} codigo={d.cotizacion.codigo} />
      </div>
      <aside className="hidden xl:block space-y-4">
        {resumen}
        <PropuestaTecnicaFicha
          cotizacionId={d.cotizacion.id}
          cuentaId={d.cuentaId}
          gestionar={datos.gestionar}
          aprobarEnvios={datos.aprobarEnvios}
          puedeEnviar={puedeEnviar}
        />
      </aside>
    </div>
  );
}
