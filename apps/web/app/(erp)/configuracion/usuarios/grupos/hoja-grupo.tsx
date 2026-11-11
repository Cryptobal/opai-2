"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Sheet, Skeleton } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { ArchivarGrupo } from "./archivar-grupo";
import { CamposGrupo, datosGrupo, errorDuplicado, type ValoresGrupo } from "./campos-grupo";
import { MiembrosGrupo } from "./miembros-grupo";
import { contarMiembros, type GrupoVista } from "./tipos";
import { useDetalleGrupo } from "./use-detalle-grupo";

type Props = { grupo: GrupoVista; gestiona: boolean; onCerrar: () => void };

const valoresDe = (g: GrupoVista): ValoresGrupo => ({
  nombre: g.nombre,
  descripcion: g.descripcion ?? "",
});

/** Detalle de un grupo: datos, miembros y archivar. Sheet desde 1024, pantalla completa en teléfono. */
export function HojaGrupo({ grupo, gestiona, onCerrar }: Props) {
  const { ejecutar, error, pendiente, limpiarError } = useCapacidad("erp");
  const {
    detalle,
    usuarios,
    error: errorCarga,
    errorUsuarios,
    recargar,
  } = useDetalleGrupo(grupo.id, gestiona);
  const origen = valoresDe(grupo);
  const [v, setV] = useState<ValoresGrupo>(origen);
  const editable = gestiona && !grupo.archivado;
  const cambios =
    Number(v.nombre.trim() !== origen.nombre.trim()) +
    Number(v.descripcion.trim() !== origen.descripcion.trim());
  const duplicado = errorDuplicado(error);

  async function guardar() {
    if (await ejecutar("core.grupos.update", { id: grupo.id, ...datosGrupo(v) }))
      avisar.exito("Grupo actualizado");
  }

  const acciones = editable ? (
    <>
      <Button
        variant="secondary"
        size="lg"
        disabled={cambios === 0}
        onClick={() => (setV(origen), limpiarError())}
      >
        Descartar
      </Button>
      <Button
        size="lg"
        className="flex-1"
        disabled={pendiente || cambios === 0 || v.nombre.trim().length < 2}
        onClick={guardar}
      >
        {pendiente ? "Guardando…" : "Guardar cambios"}
      </Button>
    </>
  ) : undefined;

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      telefono="completo"
      titulo={grupo.nombre}
      descripcion={contarMiembros(detalle?.miembros.length ?? grupo.miembros)}
      {...(acciones ? { acciones } : {})}
    >
      <div className="flex flex-col gap-5">
        {error && !duplicado ? (
          <Alerta tono="danger" titulo="No se guardaron los cambios. Inténtalo de nuevo.">
            {error}
          </Alerta>
        ) : null}
        {editable ? (
          <fieldset disabled={pendiente} className="flex flex-col gap-4">
            <CamposGrupo valores={v} onCambiar={setV} errorNombre={duplicado} />
          </fieldset>
        ) : grupo.descripcion ? (
          <p className="text-sm text-fg-muted">{grupo.descripcion}</p>
        ) : null}
        {detalle ? (
          <MiembrosGrupo
            grupo={detalle}
            usuarios={usuarios}
            editable={editable}
            errorUsuarios={errorUsuarios}
            onCambio={recargar}
          />
        ) : errorCarga ? (
          <Alerta tono="danger" titulo="No pudimos cargar los miembros">
            {errorCarga}
          </Alerta>
        ) : (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Cargando miembros">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}
        {editable ? (
          <div className="border-t border-border pt-4">
            <ArchivarGrupo grupo={grupo} onArchivado={onCerrar} />
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
