"use client";

import { Empty, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { DetalleTenant } from "./tipos";

const ESTADO: Record<string, string> = {
  activo: "activo",
  trial: "en prueba",
  solo_lectura: "solo lectura",
  suspendido: "suspendido",
};

/** Módulos registrados con interruptor activo/suspendido y opción de prueba. */
export function Modulos({ detalle }: { detalle: DetalleTenant }) {
  const { ejecutar, error, pendiente } = useCapacidad("platform");
  const porId = new Map(detalle.modulos.map((m) => [m.id, m]));
  // «Requiere Comercial · activo»: el nombre y el estado de la dependencia, nunca su id (hoja §2.4).
  const requiere = (ids: readonly string[]) =>
    `Requiere ${ids
      .map((id) => {
        const d = porId.get(id);
        return d ? `${d.nombre} · ${ESTADO[d.estado ?? ""] ?? "no contratado"}` : id;
      })
      .join(", ")}`;
  const set = (moduloId: string, estado: string) =>
    void ejecutar("platform.modules.set", { tenantId: detalle.tenant.id, moduloId, estado });
  if (detalle.modulos.length === 0) {
    return <Empty titulo="Aún no hay módulos registrados" />;
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
                  ? requiere(m.dependencias)
                  : m.estado === "solo_lectura"
                    ? "Solo lectura: se ve y se lee, no se escribe"
                    : (ESTADO[m.estado ?? ""] ?? "No contratado")
              }
              activo={activo}
              disabled={pendiente}
              onCambiar={(on) => set(m.id, on ? "activo" : "suspendido")}
            />
            {activo ? (
              <Switch
                etiqueta="En prueba"
                activo={m.estado === "trial"}
                disabled={pendiente}
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
