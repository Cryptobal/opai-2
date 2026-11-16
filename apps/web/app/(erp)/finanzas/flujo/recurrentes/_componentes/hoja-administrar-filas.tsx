"use client";

import { useState } from "react";

import { Alerta, avisar, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { FilaEgresoEditor } from "@/app/(erp)/configuracion/_finanzas/fila-egreso-editor";
import type { FilaFlujo } from "@/app/(erp)/finanzas/flujo/_componentes/datos";
import { GRUPO_POR_DEFECTO, type GrupoEgreso } from "@/app/(erp)/finanzas/flujo/_componentes/grupos-egreso";

/** Archivar filas y cambiar su grupo (dueño único junto a gastos recurrentes; CAR-582). */
export function HojaAdministrarFilas({ filas }: { filas: FilaFlujo[] }) {
  const hoja = useHojaUrl("filas");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [lista, setLista] = useState(filas);
  const [previas, setPrevias] = useState(filas);
  if (filas !== previas) {
    setPrevias(filas);
    setLista(filas);
  }
  const egresos = lista.filter((f) => f.seccion === "egreso");

  const poner = (f: FilaFlujo) =>
    setLista((l) => (l.some((x) => x.id === f.id) ? l.map((x) => (x.id === f.id ? f : x)) : [...l, f]));

  async function cambiarGrupo(id: string, grupo: GrupoEgreso) {
    const r = await ejecutar<FilaFlujo>("finanzas.filas.actualizar", { id, grupo });
    if (!r) return;
    poner(r);
    avisar.exito("Grupo actualizado");
  }

  async function archivarFila(id: string, archivar: boolean) {
    const r = await ejecutar<FilaFlujo>("finanzas.filas.archivar", { id, archivar });
    if (!r) return;
    poner(r);
    avisar.exito(archivar ? "Fila archivada" : "Fila restaurada");
  }

  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Administrar filas"
      descripcion="Archiva una fila para ocultarla del flujo sin borrar lo ya registrado. El grupo define en qué sección de egresos aparece."
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {egresos.length === 0 ? (
          <p className="text-sm text-fg-muted">Aún no hay filas de egreso. Crea una desde «Nuevo gasto recurrente» con «+ Nueva fila…».</p>
        ) : (
          <ul className="text-sm text-fg">
            {egresos.map((f) => (
              <FilaEgresoEditor
                key={f.id}
                fila={{ ...f, grupo: f.grupo ?? GRUPO_POR_DEFECTO }}
                pendiente={pendiente}
                onGrupo={(g) => void cambiarGrupo(f.id, g)}
                onArchivar={() => void archivarFila(f.id, f.activa)}
              />
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}