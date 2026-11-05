"use client";

import { useEffect, useState } from "react";

import { Campo, Input, Select } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { useCapacidad } from "@/app/_components/use-capacidad";

type Patron = { id: string; nombre: string; resumen: string };

/** «4×4» y «4x4» son el mismo patrón (igual que el motor). */
export const mismoPatron = (a: string, b: string) => a.replace("×", "x") === b.replace("×", "x");

/** Opciones del selector: los patrones de la empresa y, si el puesto trae otro, ese valor para no perderlo. */
export function opcionesPatron(patrones: readonly Patron[], actual: string) {
  const opciones = patrones.map((p) => ({ valor: p.nombre, etiqueta: p.nombre, descripcion: p.resumen }));
  if (actual && !patrones.some((p) => mismoPatron(p.nombre, actual)))
    opciones.push({ valor: actual, etiqueta: actual, descripcion: "No está en Operaciones" });
  return opciones;
}

/**
 * Patrón de turno elegido entre los que la empresa configuró en Operaciones (`core.patrones.list`). Si
 * no hay patrones o la persona no puede verlos, cae a texto libre con el enlace para configurarlos.
 */
export function CampoPatron({ valor, onCambiar }: { valor: string; onCambiar: (v: string) => void }) {
  const { ejecutar } = useCapacidad("erp");
  const [patrones, setPatrones] = useState<Patron[] | null>(null);
  useEffect(() => {
    void ejecutar<Patron[]>("core.patrones.list", {}, false, "ninguna").then((r) => setPatrones(r ?? []));
  }, [ejecutar]);

  if (patrones === null)
    return (
      <Campo etiqueta="Patrón de turno" htmlFor="cpq-p-patron">
        <Select id="cpq-p-patron" valor={undefined} onCambiar={() => undefined} opciones={[]} placeholder="Cargando…" disabled />
      </Campo>
    );
  if (patrones.length === 0)
    return (
      <Campo etiqueta="Patrón de turno" htmlFor="cpq-p-patron">
        <Input id="cpq-p-patron" placeholder="Ej. 4x4" value={valor} onChange={(x) => onCambiar(x.target.value)} />
        <EnlaceBoton href="/configuracion/operaciones?tab=patrones" variante="ghost" className="mt-1 px-0">
          Configurar patrones en Operaciones
        </EnlaceBoton>
      </Campo>
    );
  const opciones = opcionesPatron(patrones, valor);
  const elegido = opciones.find((o) => mismoPatron(o.valor, valor))?.valor;
  return (
    <Campo etiqueta="Patrón de turno" htmlFor="cpq-p-patron">
      <Select id="cpq-p-patron" valor={elegido} onCambiar={onCambiar} opciones={opciones} placeholder="Elige un patrón" />
    </Campo>
  );
}
