"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Sheet, Switch } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { conteoPuestos, type Funcion } from "./tipos";

/** Crear o editar una función de puesto (Brief 11). El modelo guarda nombre, vertical y estado. */
export function HojaFuncion({
  funcion,
  puedeDesactivar = false,
}: {
  funcion?: Funcion;
  puedeDesactivar?: boolean;
}) {
  const hoja = useHojaUrl(funcion ? "editar" : "nuevo");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [nombre, setNombre] = useState(funcion?.nombre ?? "");
  const [vertical, setVertical] = useState(funcion?.vertical ?? "");
  const [activo, setActivo] = useState(funcion?.activo ?? true);
  const nombreMalo = nombre.trim().length < 2;

  async function guardar() {
    const campos = { nombre: nombre.trim(), vertical: vertical.trim() || null };
    if (funcion) {
      const r = await ejecutar("core.funciones.update", { id: funcion.id, ...campos });
      if (!r) return;
      if (activo !== funcion.activo) {
        const r2 = await ejecutar("core.funciones.set_activo", { id: funcion.id, activo });
        if (!r2) return;
      }
      avisar.exito("Función actualizada");
    } else {
      const r = await ejecutar("core.funciones.create", campos);
      if (!r) return;
      avisar.exito("Función creada");
    }
    hoja.cerrar();
  }

  return (
    <Sheet
      abierto={funcion ? hoja.valor === funcion.id : hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo={funcion ? "Editar función" : "Nueva función"}
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || nombreMalo} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : funcion ? "Guardar cambios" : "Crear función"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Nombre de la función" htmlFor="f-nombre">
          <Input id="f-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo
          etiqueta="Vertical"
          htmlFor="f-vertical"
          ayuda="Opcional: a qué vertical aplica (seguridad, aseo…). Vacío = todas."
        >
          <Input id="f-vertical" value={vertical} onChange={(e) => setVertical(e.target.value)} />
        </Campo>
        {funcion && puedeDesactivar ? (
          <Switch
            etiqueta="Activa"
            descripcion={
              funcion.puestosActivos > 0
                ? `En uso en ${conteoPuestos(funcion.puestosActivos)}. Desactivar no borra: solo impide elegirla en puestos nuevos.`
                : "Una función inactiva no se ofrece en puestos nuevos."
            }
            activo={activo}
            onCambiar={setActivo}
          />
        ) : null}
      </div>
    </Sheet>
  );
}
