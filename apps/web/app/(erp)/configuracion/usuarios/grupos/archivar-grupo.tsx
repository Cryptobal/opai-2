"use client";

import { Archive } from "lucide-react";
import { useState } from "react";

import { avisar, Button, Dialog } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { GrupoVista } from "./tipos";

/** Archivar un grupo: sale de la lista y conserva miembros e historial (no se borra). */
export function ArchivarGrupo({
  grupo,
  onArchivado,
}: {
  grupo: GrupoVista;
  onArchivado: () => void;
}) {
  const { ejecutar, error, pendiente } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);

  async function archivar() {
    if (!(await ejecutar("core.grupos.archive", { id: grupo.id }))) return;
    setAbierto(false);
    avisar.exito("Grupo archivado");
    onArchivado();
  }

  return (
    <>
      <Button variant="ghost" onClick={() => setAbierto(true)}>
        <Archive className="size-4" aria-hidden />
        Archivar grupo
      </Button>
      <Dialog
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo={`¿Archivar «${grupo.nombre}»?`}
        descripcion="Sale de la lista de grupos y ya no se puede editar ni cambiar de miembros. Las personas siguen en la empresa con su mismo acceso."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={pendiente} onClick={archivar}>
              Archivar
            </Button>
          </>
        }
      >
        {error ? (
          <p role="alert" className="text-sm font-medium text-danger-fg">
            {error}
          </p>
        ) : null}
      </Dialog>
    </>
  );
}
