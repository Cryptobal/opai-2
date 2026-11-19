"use client";

import { useState } from "react";

import { formatearClp } from "@opai/domain";
import { avisar, Button, Campo, Input } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import type { InstalacionDetalle } from "@/lib/tipos-maestros";

type Tarifas = {
  instalacionClp: number | null;
  puestos: { puestoId: string; montoClp: number | null }[];
};

/** Tarifas sugeridas de turno extra en la instalación (CAR-620). */
export function TarifasTurnoExtra({
  instalacionId,
  instalacion,
  tarifas,
  puedeEditar,
}: {
  instalacionId: string;
  instalacion: InstalacionDetalle;
  tarifas: Tarifas;
  puedeEditar: boolean;
}) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  const [instMonto, setInstMonto] = useState(String(tarifas.instalacionClp ?? ""));
  const map = new Map(tarifas.puestos.map((p) => [p.puestoId, p.montoClp]));
  async function guardar(sujetoTipo: "instalacion" | "puesto", sujetoId: string, monto: number) {
    if (await ejecutar("pauta.turnos_extra.monto_fijar", { sujetoTipo, sujetoId, montoClp: monto })) {
      avisar.exito("Tarifa guardada");
    }
  }
  return (
    <div className="flex flex-col gap-6 p-4 md:p-0">
      <p className="t-body-sm text-fg-muted">
        El monto sugerido al registrar un turno extra sale del puesto si tiene tarifa; si no, de la instalación. Cambiar una tarifa no altera turnos ya registrados.
      </p>
      <Campo etiqueta="Tarifa de la instalación (CLP)" htmlFor="tarifa-inst">
        <div className="flex gap-2">
          <Input id="tarifa-inst" inputMode="numeric" value={instMonto} disabled={!puedeEditar} onChange={(e) => setInstMonto(e.target.value.replace(/\D/g, ""))} />
          {puedeEditar ? (
            <Button cargando={pendiente} onClick={() => void guardar("instalacion", instalacionId, Number(instMonto) || 0)}>
              Guardar
            </Button>
          ) : null}
        </div>
      </Campo>
      <ul className="flex flex-col gap-3">
        {instalacion.puestos.filter((p) => p.estado === "activo").map((p) => {
          const v = map.get(p.id);
          return (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle py-2">
              <div>
                <p className="t-label">{p.nombre}</p>
                <p className="t-caption text-fg-muted">{v != null ? formatearClp(v) : "Hereda instalación"}</p>
              </div>
              {puedeEditar ? (
                <Button size="md" variant="secondary" cargando={pendiente} onClick={() => void guardar("puesto", p.id, v ?? (Number(instMonto) || 0))}>
                  Fijar puesto
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}