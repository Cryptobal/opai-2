"use client";

import { useState } from "react";

import { Alerta, avisar, SeccionTarjeta } from "@opai/ds";

import { AsignarACargo, FilasACargo } from "@/app/_components/alcance/a-cargo";
import { useCapacidad } from "@/app/_components/use-capacidad";

type Supervisor = { membershipId: string; nombre: string; email: string };
export type SupervisoresDeInstalacion = {
  instalacionId: string;
  asignados: Supervisor[];
  candidatos: Supervisor[];
};

const fila = (s: Supervisor) => ({ id: s.membershipId, nombre: s.nombre, detalle: s.email });

/**
 * Supervisores que tienen la instalación en su alcance; un owner o admin los asigna o quita aquí con
 * las mismas capacidades que la ficha del usuario. Tras escribir, la acción de servidor revalida la
 * página y los datos llegan nuevos por props (sin estado duplicado).
 */
export function SupervisoresACargo({
  datos,
  puedeGestionar,
}: {
  datos: SupervisoresDeInstalacion;
  puedeGestionar: boolean;
}) {
  const { ejecutar, pendiente: ejecutando, error } = useCapacidad("erp");
  const [elegidos, setElegidos] = useState<string[]>([]);
  // Dura todo el lote: entre una asignación y la siguiente el botón no se puede volver a pulsar.
  const [enLote, setEnLote] = useState(false);
  const pendiente = ejecutando || enLote;

  async function asignar() {
    const ids = elegidos;
    setEnLote(true);
    try {
      for (const [n, membershipId] of ids.entries()) {
        const r = await ejecutar("core.supervisores.asignar", {
          membershipId,
          instalacionIds: [datos.instalacionId],
        });
        // Si uno falla, quedan elegidos solo los que faltan (los anteriores ya están a cargo).
        if (!r) return setElegidos(ids.slice(n));
      }
      setElegidos([]);
      avisar.exito(ids.length > 1 ? "Supervisores asignados" : "Supervisor asignado");
    } finally {
      setEnLote(false);
    }
  }

  async function quitar(membershipId: string) {
    const r = await ejecutar("core.supervisores.quitar", {
      membershipId,
      instalacionIds: [datos.instalacionId],
    });
    if (r) avisar.exito("Supervisor quitado");
  }

  return (
    <SeccionTarjeta titulo="Supervisores a cargo">
      <div className="flex flex-col gap-3">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <FilasACargo
          items={datos.asignados.map(fila)}
          vacio="Ningún supervisor tiene esta instalación a cargo."
          pendiente={pendiente}
          onQuitar={puedeGestionar ? (id) => void quitar(id) : undefined}
        />
        {puedeGestionar && datos.candidatos.length ? (
          <AsignarACargo
            id={`supervisores-${datos.instalacionId}`}
            etiqueta="Asignar supervisores"
            placeholder="Buscar supervisor"
            opciones={datos.candidatos.map((s) => ({
              valor: s.membershipId,
              etiqueta: s.nombre,
              detalle: s.email,
            }))}
            elegidos={elegidos}
            onCambiar={setElegidos}
            onAsignar={() => void asignar()}
            pendiente={pendiente}
          />
        ) : null}
        {puedeGestionar && !datos.candidatos.length && !datos.asignados.length ? (
          <p className="t-caption">
            Para asignar, primero invita a un usuario con rol Supervisor en Configuración →
            Usuarios.
          </p>
        ) : null}
      </div>
    </SeccionTarjeta>
  );
}
