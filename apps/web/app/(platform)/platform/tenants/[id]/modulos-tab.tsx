"use client";

import { Empty, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { DetalleTenant } from "./tipos";

/** Módulos registrados con interruptor activo/suspendido y opción de prueba. */
export function Modulos({ detalle }: { detalle: DetalleTenant }) {
  const { ejecutar, error } = useCapacidad("platform");
  const set = (moduloId: string, estado: string) =>
    void ejecutar("platform.modules.set", { tenantId: detalle.tenant.id, moduloId, estado });
  if (detalle.modulos.length === 0) {
    return (
      <Empty
        titulo="Aún no hay módulos registrados"
        descripcion="Llegan con Comercial y CPQ (fase 2)."
      />
    );
  }
  return (
    <div className="divide-y divide-border">
      {error ? <p className="py-2 text-sm font-medium text-danger-fg">{error}</p> : null}
      {detalle.modulos.map((m) => {
        const activo = m.estado === "activo" || m.estado === "trial" || m.estado === "solo_lectura";
        return (
          <div key={m.id} className="py-1">
            <Switch
              etiqueta={m.nombre}
              descripcion={
                m.dependencias.length
                  ? `Requiere ${m.dependencias.join(", ")}`
                  : m.estado === "solo_lectura"
                    ? "Solo lectura: se ve y se lee, no se escribe"
                    : (m.estado ?? "No contratado")
              }
              activo={activo}
              onCambiar={(on) => set(m.id, on ? "activo" : "suspendido")}
            />
            {activo ? (
              <Switch
                etiqueta="En prueba"
                activo={m.estado === "trial"}
                onCambiar={(on) => set(m.id, on ? "trial" : "activo")}
                className="pl-4"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
