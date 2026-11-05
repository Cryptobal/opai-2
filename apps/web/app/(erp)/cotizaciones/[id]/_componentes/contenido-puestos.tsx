"use client";

import type { DatosFichaCotizacion } from "../../_componentes/datos";
import { FichaCotizacionLineas } from "./ficha-cotizacion-lineas";
import type { ModalesFichaCotizacion } from "./ficha-cotizacion-modales";

type Ficha = NonNullable<DatosFichaCotizacion["ficha"]>;
type Ejecutar = (id: string, input: unknown) => Promise<unknown | null>;

/** Bloque 2: puestos (turno, guardias, horario). Editar solo en borrador (si no, «Reabrir para editar»). */
export function ContenidoPuestos(p: {
  d: Ficha;
  verCostos: boolean;
  editable: boolean;
  pendiente: boolean;
  ejecutar: Ejecutar;
  limpiarError: () => void;
  recargar: () => void;
  modales: ModalesFichaCotizacion;
}) {
  const { d, modales } = p;
  return (
    <div className="space-y-3">
      <FichaCotizacionLineas
        d={d}
        editable={p.editable}
        pendiente={p.pendiente}
        verCostos={p.verCostos}
        onAgregar={modales.setHojaSeccion}
        onEditar={modales.setLineaEditar}
        onQuitar={(id) => void p.ejecutar("cpq.lineas.quitar", { id }).then((r) => r != null && p.recargar())}
        onTraza={(lineaId) => {
          p.limpiarError();
          const linea = d.secciones.flatMap((s) => s.lineas).find((l) => l.id === lineaId);
          void p.ejecutar("cpq.cotizaciones.explicar", { id: d.cotizacion.id, lineaId }).then((r) => {
            if (r && typeof r === "object" && "traza" in r)
              modales.setTrazaAbierta({
                titulo: `Traza · ${linea?.nombre ?? "línea"}`,
                traza: (r as { traza: Record<string, unknown>[] }).traza,
              });
          });
        }}
      />
    </div>
  );
}
