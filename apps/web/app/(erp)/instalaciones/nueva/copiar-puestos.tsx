"use client";

import { useState } from "react";

import { Checkbox, Empty, Skeleton } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import type { InstalacionDetalle, InstalacionFila, Puesto } from "@/lib/tipos-maestros";

/** Elige instalaciones cuyas posiciones activas se copian a la nueva (función, patrón y horario). */
export function CopiarPuestos({
  instalaciones,
  onCambiar,
}: {
  instalaciones: InstalacionFila[];
  onCambiar: (p: Puesto[]) => void;
}) {
  const [elegidas, setElegidas] = useState<Record<string, Puesto[]>>({});
  const [cargando, setCargando] = useState<string | null>(null);
  async function alternar(i: InstalacionFila, on: boolean) {
    let siguiente = { ...elegidas };
    if (on) {
      setCargando(i.id);
      const r = await ejecutarCapacidad("erp", "core.instalaciones.get", { id: i.id });
      setCargando(null);
      siguiente[i.id] = r.ok
        ? (r.data as InstalacionDetalle).puestos.filter((p) => p.estado === "activo")
        : [];
    } else {
      const { [i.id]: _fuera, ...resto } = siguiente;
      siguiente = resto;
    }
    setElegidas(siguiente);
    onCambiar(Object.values(siguiente).flat());
  }
  if (!instalaciones.length)
    return (
      <Empty
        titulo="Sin instalaciones de donde copiar"
        descripcion="Los puestos se pueden crear después, en la ficha."
      />
    );
  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface px-3">
      {instalaciones.map((i) => (
        <div key={i.id} className="border-b border-border last:border-b-0">
          <Checkbox
            etiqueta={i.nombre}
            descripcion={`${i.comuna ?? "Sin comuna"} · ${i.puestos} ${i.puestos === 1 ? "puesto" : "puestos"}`}
            marcado={i.id in elegidas}
            onCambiar={(on) => void alternar(i, on)}
          />
          {cargando === i.id ? <Skeleton className="mb-2 h-4" /> : null}
        </div>
      ))}
    </div>
  );
}
