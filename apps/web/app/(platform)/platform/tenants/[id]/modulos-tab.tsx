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

type Cap = ReturnType<typeof useCapacidad>;

/** Módulos registrados con interruptor activo/suspendido y opción de prueba. */
export function Modulos({
  detalle,
  puedeNuevos,
}: {
  detalle: DetalleTenant;
  puedeNuevos: boolean;
}) {
  const { ejecutar, error, pendiente } = useCapacidad("platform");
  return (
    <div className="divide-y divide-border">
      {error ? <p className="py-2 text-sm font-medium text-danger-fg">{error}</p> : null}
      <ModulosNuevos
        detalle={detalle}
        puede={puedeNuevos}
        pendiente={pendiente}
        ejecutar={ejecutar}
      />
      {detalle.modulos.length === 0 ? (
        <Empty titulo="Aún no hay módulos registrados" />
      ) : (
        <Lista detalle={detalle} pendiente={pendiente} ejecutar={ejecutar} />
      )}
    </div>
  );
}

function ModulosNuevos({
  detalle,
  puede,
  pendiente,
  ejecutar,
}: {
  detalle: DetalleTenant;
  puede: boolean;
  pendiente: boolean;
  ejecutar: Cap["ejecutar"];
}) {
  return (
    <Switch
      etiqueta="Activar módulos nuevos automáticamente"
      descripcion="Los módulos que se agreguen al catálogo quedan activos en esta empresa. Los que ya existían no cambian."
      activo={detalle.activarModulosNuevos}
      disabled={pendiente || !puede}
      onCambiar={(on) =>
        void ejecutar("platform.tenants.set_modulos_nuevos", {
          tenantId: detalle.tenant.id,
          activo: on,
        })
      }
    />
  );
}

function Lista({
  detalle,
  pendiente,
  ejecutar,
}: {
  detalle: DetalleTenant;
  pendiente: boolean;
  ejecutar: Cap["ejecutar"];
}) {
  const porId = new Map(detalle.modulos.map((m) => [m.id, m]));
  const requiere = (ids: readonly string[]) =>
    `Requiere ${ids
      .map((id) => {
        const d = porId.get(id);
        return d ? `${d.nombre} · ${ESTADO[d.estado ?? ""] ?? "no contratado"}` : id;
      })
      .join(", ")}`;
  const set = (moduloId: string, estado: string) =>
    void ejecutar("platform.modules.set", { tenantId: detalle.tenant.id, moduloId, estado });
  return detalle.modulos.map((m) => {
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
  });
}
