"use client";

import { Button } from "@opai/ds";

import type { DatosFichaCotizacion } from "../../_componentes/datos";
import type { LineaEditable } from "../../_componentes/puesto-tipos";
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
  onEditar: (linea: LineaEditable) => void;
  onQuitar: (id: string) => void;
  onTraza: (lineaId: string) => void;
}) {
  // Solo las secciones con puestos o con instalación: la sección «Común» vacía no es una tarjeta más.
  // Sin instalaciones ni puestos solo existe «Común» vacía: se muestra igual, porque es la única que ofrece «Agregar puesto».
  const conContenido = d.secciones.filter((s) => s.lineas.length > 0 || s.instalacionId);
  const secciones = conContenido.length > 0 ? conContenido : d.secciones;
  return (
    <div className="space-y-4">
      {secciones.length === 0 ? (
        <p className="t-body text-fg-muted">Todavía no hay puestos. Agrega el primero para calcular el precio.</p>
      ) : null}
      {secciones.map((s) => (
        <section key={s.id} aria-label={s.nombre} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="t-label">{s.nombre}</h3>
            {editable ? (
              <Button type="button" variant="secondary" size="md" onClick={() => onAgregar(s.id)}>
                Agregar puesto
              </Button>
            ) : null}
          </div>
          <ul className="divide-y divide-border rounded-md border border-border">
            {s.lineas.length === 0 ? (
              <li className="p-4 t-caption text-fg-muted">Sin puestos en esta instalación</li>
            ) : (
              s.lineas.map((l) => (
                <li key={l.id} className="px-4 py-3.5">
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
        </section>
      ))}
    </div>
  );
}
