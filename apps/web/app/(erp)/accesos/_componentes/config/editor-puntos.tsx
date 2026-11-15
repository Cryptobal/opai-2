"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Input, SeccionTarjeta, Select, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

export type Punto = { id?: string; nombre: string; tipo: string; activo: boolean };

const TIPOS = [
  { valor: "peatonal", etiqueta: "Peatonal" },
  { valor: "vehicular", etiqueta: "Vehicular" },
  { valor: "mixto", etiqueta: "Peatonal y vehicular" },
];

/**
 * Puntos de acceso de la instalación (CAR-479 parte 2): portería principal, acceso vehicular, etc. No se borran,
 * se desactivan (los registros guardan por cuál entró cada persona). La portería elige entre los activos.
 */
export function EditorPuntos({
  instalacionId,
  puntos,
}: {
  instalacionId: string;
  puntos: Punto[];
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [ps, setPs] = useState(puntos);
  const [nuevo, setNuevo] = useState("");
  const cambiar = (i: number, x: Partial<Punto>) =>
    setPs((v) => v.map((p, j) => (j === i ? { ...p, ...x } : p)));
  async function guardar() {
    const r = await ejecutar<{ items: Punto[] }>("acceso.puntos.set", {
      instalacionId,
      puntos: ps,
    });
    if (!r) return;
    setPs(r.items);
    avisar.exito("Puntos de acceso guardados");
  }
  return (
    <SeccionTarjeta titulo="Puntos de acceso" sinRelleno>
      <p className="t-caption px-4 pt-3">
        Sin puntos, la portería registra en la instalación. Con más de uno, el teléfono elige desde
        cuál registra.
      </p>
      {error ? <Alerta tono="danger" titulo={error} className="mx-4 mt-3" /> : null}
      <ul className="flex flex-col">
        {ps.map((p, i) => (
          <li
            key={p.id ?? `n${i}`}
            className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2"
          >
            <Input
              aria-label={`Nombre del punto ${i + 1}`}
              className="min-w-0 flex-1 basis-full sm:basis-0"
              maxLength={60}
              value={p.nombre}
              onChange={(e) => cambiar(i, { nombre: e.target.value })}
            />
            <div className="w-48">
              <Select
                aria-label={`Tipo de ${p.nombre}`}
                valor={p.tipo}
                opciones={TIPOS}
                onCambiar={(tipo) => cambiar(i, { tipo })}
              />
            </div>
            <Switch
              soloControl
              etiqueta={`${p.nombre} activo`}
              activo={p.activo}
              onCambiar={(activo) => cambiar(i, { activo })}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 p-4">
        <Input
          aria-label="Nombre del punto nuevo"
          placeholder="Punto nuevo, por ejemplo «Bodega»"
          className="min-w-0 flex-1 basis-full sm:basis-0"
          maxLength={60}
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
        />
        <Button
          variant="secondary"
          disabled={nuevo.trim().length < 2 || ps.length >= 20}
          onClick={() => {
            setPs((v) => [...v, { nombre: nuevo.trim(), tipo: "peatonal", activo: true }]);
            setNuevo("");
          }}
        >
          Agregar punto
        </Button>
        <Button disabled={pendiente} onClick={() => void guardar()}>
          {pendiente ? "Guardando…" : "Guardar puntos"}
        </Button>
      </div>
    </SeccionTarjeta>
  );
}
