"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Checkbox, Select, Sheet, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Candidato, InstalacionOpcion } from "./tipos";

/** Vincula a un contacto ya invitado al portal «cliente» con la cuenta y sus instalaciones. */
export function HojaVincular({
  abierta,
  onCerrar,
  cuentaId,
  candidatos,
  instalaciones,
  recargar,
}: {
  abierta: boolean;
  onCerrar: () => void;
  cuentaId: string;
  candidatos: Candidato[];
  instalaciones: InstalacionOpcion[];
  recargar: () => Promise<void>;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [membershipId, setMembershipId] = useState("");
  const [todas, setTodas] = useState(false);
  const [ids, setIds] = useState<string[]>([]);

  async function vincular() {
    const r = await ejecutar("portal_cliente.accesos.vincular", {
      membershipId,
      cuentaId,
      todasInstalaciones: todas,
      instalacionIds: todas ? [] : ids,
    }, false, "ninguna");
    if (r) {
      avisar.exito("Contacto vinculado");
      setMembershipId("");
      setIds([]);
      onCerrar();
      await recargar();
    }
  }

  return (
    <Sheet
      abierto={abierta}
      onCerrar={onCerrar}
      titulo="Vincular contacto"
      descripcion="El contacto ve solo las instalaciones que habilites; sin ninguna, no ve nada."
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button disabled={pendiente || !membershipId} onClick={() => void vincular()}>Vincular</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {candidatos.length === 0 ? (
          <Alerta tono="info" titulo="No hay contactos por vincular">
            Invítalos primero desde Usuarios, con el rol «Solo lectura» y el portal «Cliente».
          </Alerta>
        ) : (
          <Campo etiqueta="Contacto" htmlFor="vincular-contacto">
            <Select
              id="vincular-contacto"
              valor={membershipId || undefined}
              placeholder="Elige un contacto"
              opciones={candidatos.map((c) => ({ valor: c.membershipId, etiqueta: c.nombre, descripcion: c.email }))}
              onCambiar={setMembershipId}
            />
          </Campo>
        )}
        <Switch etiqueta="Todas las instalaciones de la cuenta" activo={todas} onCambiar={setTodas} />
        {todas
          ? null
          : instalaciones.map((i) => (
              <Checkbox
                key={i.id}
                etiqueta={i.nombre}
                marcado={ids.includes(i.id)}
                onCambiar={(on) => setIds(on ? [...ids, i.id] : ids.filter((x) => x !== i.id))}
              />
            ))}
        {error ? <Alerta tono="danger" titulo={error} /> : null}
      </div>
    </Sheet>
  );
}
