"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Dialog } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** Archivar (con confirmación) o restaurar un contacto: `core.contactos.archive` y `…restaurar`. */
export function ArchivarContacto(p: {
  id: string;
  nombre: string;
  archivado: boolean;
  /** Con `core:cuentas.manage` se archiva y restaura; sin él solo se ve el aviso. */
  gestiona: boolean;
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);
  async function archivar() {
    if (await ejecutar("core.contactos.archive", { id: p.id })) {
      setAbierto(false);
      avisar.exito("Contacto archivado");
    }
  }
  async function restaurar() {
    if (await ejecutar("core.contactos.restaurar", { id: p.id })) avisar.exito("Contacto restaurado");
  }
  if (p.archivado)
    return (
      <div className="flex flex-col gap-2">
        <Alerta tono="warning" titulo="Contacto archivado">
          No aparece en las listas ni como principal. Su historial se conserva.
        </Alerta>
        {error ? <p className="text-sm font-medium text-danger-fg">{error}</p> : null}
        {p.gestiona ? (
          <Button variant="secondary" disabled={pendiente} onClick={() => void restaurar()}>
            Restaurar contacto
          </Button>
        ) : null}
      </div>
    );
  return (
    <>
      <Button variant="ghost" onClick={() => setAbierto(true)}>
        Archivar contacto
      </Button>
      <Dialog
        abierto={abierto}
        onCerrar={() => {
          setAbierto(false);
          limpiarError();
        }}
        titulo={`¿Archivar a ${p.nombre}?`}
        descripcion="Deja de aparecer en las listas y ya no puede ser el principal de su cuenta. Su historial y sus actividades se conservan, y puedes restaurarlo cuando quieras."
        acciones={
          <>
            <Button variant="ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button disabled={pendiente} onClick={() => void archivar()}>
              Archivar
            </Button>
          </>
        }
      >
        {error ? <p className="text-sm font-medium text-danger-fg">{error}</p> : null}
      </Dialog>
    </>
  );
}
