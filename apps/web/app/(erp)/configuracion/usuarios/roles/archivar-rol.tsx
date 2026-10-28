"use client";

import { Archive, Copy, MoreHorizontal } from "lucide-react";
import { useState } from "react";

import { avisar, Button, Dialog, Menu } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { useCapacidad } from "@/app/_components/use-capacidad";

import type { RolVista } from "../_permisos/roles";

type Props = { rol: RolVista; onDuplicar: () => void; onArchivado: () => void };

/**
 * Acciones de un rol personalizado (A2/A3): duplicar y archivar. Un rol en uso no se archiva
 * (§16.2): el diálogo lo explica y lleva a los usuarios para reasignarlos primero.
 */
export function AccionesRol({ rol, onDuplicar, onArchivado }: Props) {
  const { ejecutar, error, pendiente } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);
  const enUso = rol.usuarios > 0;

  async function archivar() {
    if (await ejecutar("core.roles.archive", { id: rol.id })) {
      setAbierto(false);
      avisar.exito("Rol archivado");
      onArchivado();
    }
  }

  return (
    <>
      <Menu
        etiqueta={`Acciones del rol ${rol.nombre}`}
        disparador={<MoreHorizontal className="size-5" aria-hidden />}
        lado="abajo-derecha"
        items={[
          {
            id: "duplicar",
            etiqueta: "Duplicar como nuevo rol",
            icono: Copy,
            onSelect: onDuplicar,
          },
          {
            id: "archivar",
            etiqueta: "Archivar rol",
            icono: Archive,
            peligro: true,
            onSelect: () => setAbierto(true),
          },
        ]}
      />
      <Dialog
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo={enUso ? `No puedes archivar «${rol.nombre}»` : `¿Archivar «${rol.nombre}»?`}
        descripcion={
          enUso
            ? `Lo ${rol.usuarios === 1 ? "tiene 1 usuario" : `tienen ${rol.usuarios} usuarios`}. Reasígnalos a otro rol primero.`
            : "Sale de la lista de roles y ya no se puede asignar."
        }
        acciones={
          enUso ? (
            <>
              <Button variant="secondary" onClick={() => setAbierto(false)}>
                Cerrar
              </Button>
              <EnlaceBoton href="/configuracion/usuarios">Ver usuarios</EnlaceBoton>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" disabled={pendiente} onClick={archivar}>
                Archivar
              </Button>
            </>
          )
        }
      >
        {error ? <p className="text-sm font-medium text-danger-fg">{error}</p> : null}
      </Dialog>
    </>
  );
}
