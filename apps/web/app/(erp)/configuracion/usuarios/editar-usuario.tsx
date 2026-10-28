"use client";

import { useState } from "react";

import { Button, Dialog, Sheet, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { CampoPortales, CampoRol } from "./campos";
import { InstalacionesACargo } from "./instalaciones-a-cargo";
import type { Miembro } from "./usuarios-lista";

type Props = { miembro: Miembro | null; onCerrar: () => void; miRol: string };

/** Editar rol, portales y estado; quitar de la empresa con confirmación. Último owner protegido. */
export function EditarUsuario({ miembro, onCerrar, miRol }: Props) {
  // Un formulario por miembro (key): el estado inicial sale de sus datos, sin efectos.
  return miembro ? (
    <Formulario key={miembro.id} miembro={miembro} onCerrar={onCerrar} miRol={miRol} />
  ) : null;
}

function Formulario({ miembro, onCerrar, miRol }: Props & { miembro: Miembro }) {
  const { ejecutar, error } = useCapacidad("erp");
  const [rol, setRol] = useState(miembro.rol);
  const [portales, setPortales] = useState<string[]>(miembro.portales);
  const [activo, setActivo] = useState(miembro.estado === "activa");
  const [confirmar, setConfirmar] = useState(false);

  async function guardar() {
    const input = {
      membershipId: miembro.id,
      rol,
      portales,
      estado: activo ? "activa" : "suspendida",
    };
    if (await ejecutar("core.users.update", input)) onCerrar();
  }

  async function quitar() {
    setConfirmar(false);
    if (await ejecutar("core.users.remove", { membershipId: miembro.id })) onCerrar();
  }

  return (
    <>
      <Sheet
        abierto
        onCerrar={onCerrar}
        titulo={miembro.nombre}
        acciones={
          <>
            <Button variant="secondary" size="lg" onClick={() => setConfirmar(true)}>
              Quitar
            </Button>
            <Button size="lg" className="flex-1" onClick={guardar}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-base text-fg-muted">{miembro.email}</p>
          {error ? <p className="text-sm font-medium text-danger-fg">{error}</p> : null}
          <CampoRol id="edit-rol" valor={rol} onCambiar={setRol} miRol={miRol} />
          <CampoPortales valor={portales} onCambiar={setPortales} />
          <Switch
            etiqueta="Acceso activo"
            descripcion="Suspendido no puede entrar"
            activo={activo}
            onCambiar={setActivo}
          />
          {/* Alcance por filas (CAR-38): solo del rol supervisor guardado; lo fija un owner o admin. */}
          {miembro.rol === "supervisor" && (miRol === "owner" || miRol === "admin") ? (
            <InstalacionesACargo membershipId={miembro.id} />
          ) : null}
        </div>
      </Sheet>
      <Dialog
        abierto={confirmar}
        onCerrar={() => setConfirmar(false)}
        titulo={`¿Quitar a ${miembro.nombre} de la empresa?`}
        descripcion="Pierde el acceso de inmediato. Para volver necesitará una invitación nueva."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setConfirmar(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={quitar}>
              Quitar
            </Button>
          </>
        }
      />
    </>
  );
}
