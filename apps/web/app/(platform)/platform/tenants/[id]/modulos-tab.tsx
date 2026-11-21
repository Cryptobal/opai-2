"use client";

import { Empty, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { DetalleTenant } from "./tipos";
import {
  activoParaUso,
  agruparModulosPorArea,
  TEXTO_ESTADO,
  type FilaModulo,
  type GrupoModulos,
} from "./modulos-vista";

/** Módulos y complementos pagados con interruptores directos (CAR-742). */
export function Modulos({
  detalle,
  puedeNuevos,
}: {
  detalle: DetalleTenant;
  puedeNuevos: boolean;
}) {
  const { ejecutar, error, pendiente } = useCapacidad("platform");
  const set = (moduloId: string, estado: string) =>
    void ejecutar("platform.modules.set", {
      tenantId: detalle.tenant.id,
      moduloId,
      estado,
    });
  const grupos = agruparModulosPorArea(detalle.modulos);
  const padres = new Map(
    detalle.modulos.filter((m) => !m.complemento).map((m) => [m.id, activoParaUso(m.estado)]),
  );
  return (
    <div className="flex flex-col gap-4">
      {error ? <p className="text-sm font-medium text-danger-fg">{error}</p> : null}
      <Switch
        etiqueta="Activar módulos nuevos automáticamente"
        descripcion="Los módulos que se agreguen al catálogo quedan activos en esta empresa."
        activo={detalle.activarModulosNuevos}
        disabled={pendiente || !puedeNuevos}
        onCambiar={(on) =>
          void ejecutar("platform.tenants.set_modulos_nuevos", {
            tenantId: detalle.tenant.id,
            activo: on,
          })
        }
      />
      {detalle.modulos.length === 0 ? (
        <Empty titulo="Aún no hay módulos registrados" />
      ) : (
        <div className="flex flex-col gap-5">
          {grupos.map((g) => (
            <Grupo
              key={g.area}
              grupo={g}
              padres={padres}
              pendiente={pendiente}
              set={set}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Grupo({
  grupo,
  padres,
  pendiente,
  set,
}: {
  grupo: GrupoModulos;
  padres: Map<string, boolean>;
  pendiente: boolean;
  set: (id: string, estado: string) => void;
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-medium text-muted-fg">{grupo.titulo}</h3>
      <div className="flex flex-col gap-1">
        {grupo.filas.map((m) => (
          <Fila key={m.id} fila={m} padres={padres} pendiente={pendiente} set={set} />
        ))}
      </div>
    </section>
  );
}

function Fila({
  fila: m,
  padres,
  pendiente,
  set,
}: {
  fila: FilaModulo;
  padres: Map<string, boolean>;
  pendiente: boolean;
  set: (id: string, estado: string) => void;
}) {
  const activo = activoParaUso(m.estado);
  const padreOk = !m.padreId || (padres.get(m.padreId) ?? false);
  const textoEstado = m.estado ? (TEXTO_ESTADO[m.estado] ?? m.estado) : "No contratado";
  const descripcion = m.complemento
    ? [m.etiquetaCobro, padreOk ? textoEstado : "Requiere el módulo padre activo"]
        .filter(Boolean)
        .join(" · ")
    : m.dependencias.length
      ? `Requiere ${m.dependencias.join(", ")}`
      : textoEstado;
  return (
    <div className={m.complemento ? "pl-4" : undefined}>
      <Switch
        etiqueta={m.nombre}
        descripcion={descripcion}
        activo={activo}
        disabled={pendiente || (m.complemento && !padreOk)}
        onCambiar={(on) => set(m.id, on ? "activo" : "suspendido")}
      />
      {activo && !m.complemento ? (
        <Switch
          etiqueta="En prueba"
          descripcion="El módulo sigue visible; al vencer puede pasar a solo lectura o a cobro."
          activo={m.estado === "trial"}
          disabled={pendiente}
          onCambiar={(on) => set(m.id, on ? "trial" : "activo")}
          className="pl-4"
        />
      ) : null}
    </div>
  );
}