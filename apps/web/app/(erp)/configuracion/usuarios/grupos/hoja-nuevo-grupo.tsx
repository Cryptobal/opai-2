"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { useParametros } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { CamposGrupo, datosGrupo, errorDuplicado, type ValoresGrupo } from "./campos-grupo";
import type { GrupoVista } from "./tipos";

/** Alta de un grupo: nombre y descripción; los miembros se agregan en su detalle. */
export function HojaNuevoGrupo({ onCerrar }: { onCerrar: () => void }) {
  const { ejecutar, error, pendiente } = useCapacidad("erp");
  const { fijar } = useParametros();
  const [v, setV] = useState<ValoresGrupo>({ nombre: "", descripcion: "" });
  const duplicado = errorDuplicado(error);

  async function crear() {
    const g = await ejecutar<GrupoVista>("core.grupos.create", datosGrupo(v));
    if (!g) return;
    avisar.exito("Grupo creado. Ahora agrega a sus miembros.");
    fijar({ nuevo: null, grupo: g.id });
  }

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      telefono="completo"
      titulo="Nuevo grupo"
      descripcion="Un grupo o equipo reúne a personas de la empresa que trabajan juntas."
      acciones={
        <>
          <Button variant="secondary" size="lg" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            size="lg"
            className="flex-1"
            disabled={pendiente || v.nombre.trim().length < 2}
            onClick={crear}
          >
            {pendiente ? "Creando…" : "Crear grupo"}
          </Button>
        </>
      }
    >
      <fieldset disabled={pendiente} className="flex flex-col gap-4">
        {error && !duplicado ? (
          <Alerta tono="danger" titulo="No se creó el grupo. Inténtalo de nuevo.">
            {error}
          </Alerta>
        ) : null}
        <CamposGrupo valores={v} onCambiar={setV} errorNombre={duplicado} />
      </fieldset>
    </Sheet>
  );
}
