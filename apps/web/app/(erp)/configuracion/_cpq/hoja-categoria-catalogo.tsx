"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Segmentado, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { CategoriaCatalogo } from "./catalogo-tipos";

/** Hoja para crear o editar una categoría del catálogo (`cpq.catalogo_categorias.create|update`). */
export function HojaCategoriaCatalogo({ categoria, onCerrar }: { categoria?: CategoriaCatalogo; onCerrar: () => void }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [clave, setClave] = useState(categoria?.clave ?? "");
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");
  const [clase, setClase] = useState<"directo" | "indirecto">(categoria?.clase ?? "directo");
  const valida = nombre.trim() !== "" && (categoria !== undefined || clave.trim() !== "");

  async function guardar() {
    const r = categoria
      ? await ejecutar("cpq.catalogo_categorias.update", { id: categoria.id, nombre: nombre.trim(), clase })
      : await ejecutar("cpq.catalogo_categorias.create", { clave: clave.trim(), nombre: nombre.trim(), clase });
    if (r != null) {
      avisar.exito(categoria ? "Categoría actualizada" : "Categoría creada");
      onCerrar();
    }
  }

  return (
    <Sheet
      abierto
      titulo={categoria ? "Editar categoría" : "Nueva categoría"}
      onCerrar={onCerrar}
      acciones={
        <>
          <Button type="button" variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="button" disabled={pendiente || !valida} onClick={() => void guardar()}>
            {categoria ? "Guardar" : "Crear"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Campo etiqueta="Clave" htmlFor="cat-clave" ayuda={categoria ? "La clave no se cambia." : "Identificador corto, único en la empresa."}>
          <Input id="cat-clave" value={clave} readOnly={Boolean(categoria)} onChange={(e) => setClave(e.target.value)} />
        </Campo>
        <Campo etiqueta="Nombre" htmlFor="cat-cnombre">
          <Input id="cat-cnombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Segmentado
          etiqueta="Clase de costo"
          activa={clase}
          opciones={[
            { id: "directo", etiqueta: "Directo", onClick: () => setClase("directo") },
            { id: "indirecto", etiqueta: "Indirecto", onClick: () => setClase("indirecto") },
          ]}
        />
        {error ? <Alerta tono="danger" titulo={error} /> : null}
      </div>
    </Sheet>
  );
}
