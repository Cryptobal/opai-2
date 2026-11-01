"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Checkbox, Input, Sheet, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { CuentaVinculo } from "./cuenta-vinculo";
import { ROLES_VINCULO, type VinculoContacto } from "./vinculos-tipos";

type Props = {
  contactoId: string;
  actual: VinculoContacto | null;
  vinculadas: string[];
  onCerrar: () => void;
};

export function HojaVinculo({ contactoId, actual, vinculadas, onCerrar }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [cuentaId, setCuentaId] = useState(actual?.cuentaId ?? "");
  const [cargo, setCargo] = useState(actual?.cargo ?? "");
  const [roles, setRoles] = useState(actual?.roles ?? []);
  const [esPrincipal, setPrincipal] = useState(actual?.esPrincipal ?? false);
  const sinCambios =
    actual &&
    cargo === (actual.cargo ?? "") &&
    esPrincipal === actual.esPrincipal &&
    [...roles].sort().join() === [...actual.roles].sort().join();
  async function guardar() {
    const r = await ejecutar(actual ? "core.contactos.set_roles" : "core.contactos.vincular", {
      contactoId,
      cuentaId,
      cargo: cargo.trim() || null,
      roles,
      esPrincipal,
    });
    if (!r) return;
    avisar.exito(actual ? "Vínculo actualizado" : "Contacto vinculado");
    onCerrar();
  }
  return (
    <Sheet
      abierto
      titulo={actual ? "Editar vínculo" : "Vincular a otra cuenta"}
      telefono="completo"
      descripcion={
        actual?.cuentaNombre ??
        "El cargo, los roles y el principal se aplican solo a la cuenta elegida."
      }
      onCerrar={() => {
        if (!pendiente) onCerrar();
      }}
      acciones={
        <>
          <Button variant="secondary" disabled={pendiente} onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={pendiente || !cuentaId || Boolean(sinCambios)}
            onClick={() => void guardar()}
          >
            {pendiente ? "Guardando…" : actual ? "Guardar vínculo" : "Vincular contacto"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {!actual ? (
          <CuentaVinculo
            valor={cuentaId}
            onCambiar={setCuentaId}
            vinculadas={vinculadas}
            disabled={pendiente}
          />
        ) : null}
        <Campo etiqueta="Cargo en esta cuenta" htmlFor="vinculo-cargo">
          <Input
            id="vinculo-cargo"
            value={cargo}
            maxLength={120}
            disabled={pendiente}
            onChange={(e) => setCargo(e.target.value)}
          />
        </Campo>
        <fieldset disabled={pendiente}>
          <legend className="t-label text-fg">Roles en esta cuenta</legend>
          {Object.entries(ROLES_VINCULO).map(([id, etiqueta]) => (
            <Checkbox
              key={id}
              etiqueta={etiqueta}
              marcado={roles.includes(id)}
              disabled={pendiente}
              onCambiar={(on) =>
                setRoles((prev) => (on ? [...prev, id] : prev.filter((r) => r !== id)))
              }
            />
          ))}
        </fieldset>
        <Switch
          etiqueta="Principal en esta cuenta"
          activo={esPrincipal}
          onCambiar={setPrincipal}
          disabled={pendiente}
          descripcion="Si hay otro contacto principal en esta cuenta, pasará a secundario."
        />
      </div>
    </Sheet>
  );
}
