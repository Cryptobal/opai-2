"use client";

import { Button, SeccionTarjeta } from "@opai/ds";

import type { DatosFichaCotizacion } from "../../_componentes/datos";
import { LineaCotizacion } from "./linea-cotizacion";

type Ficha = NonNullable<DatosFichaCotizacion["ficha"]>;

export function FichaCotizacionLineas({
  d,
  editable,
  pendiente,
  verCostos,
  onAgregar,
  onEditar,
  onQuitar,
  onTraza,
}: {
  d: Ficha;
  editable: boolean;
  pendiente: boolean;
  verCostos: boolean;
  onAgregar: (seccionId: string) => void;
  onEditar: (linea: { id: string; nombre: string; posiciones?: number; sueldoBaseClp?: number }) => void;
  onQuitar: (id: string) => void;
  onTraza: (lineaId: string) => void;
}) {
  return (
    <>
      {d.secciones.map((s) => (
        <SeccionTarjeta
          key={s.id}
          titulo={s.nombre}
          accion={
            editable ? (
              <Button type="button" variant="secondary" size="md" onClick={() => onAgregar(s.id)}>
                Agregar puesto
              </Button>
            ) : undefined
          }
          sinRelleno
        >
          <ul className="divide-y divide-border">
            {s.lineas.length === 0 ? (
              <li className="p-4 t-caption text-fg-muted">Sin líneas en esta sección</li>
            ) : (
              s.lineas.map((l) => (
                <li key={l.id} className="p-4">
                  <LineaCotizacion
                    linea={l}
                    editable={editable}
                    pendiente={pendiente}
                    verCostos={verCostos}
                    onEditar={onEditar}
                    onQuitar={onQuitar}
                    onTraza={() => onTraza(l.id)}
                  />
                </li>
              ))
            )}
          </ul>
        </SeccionTarjeta>
      ))}
    </>
  );
}
