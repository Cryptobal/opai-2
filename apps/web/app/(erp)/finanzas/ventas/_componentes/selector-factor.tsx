"use client";

import { useEffect, useState } from "react";

import { avisar, Button, Select } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

export type Factor = { nombre: string; rut: string; email?: string; direccion?: string };
type Ajuste = { clave: string; valor: unknown };

const esFactor = (v: unknown): v is Factor => {
  const f = v as Partial<Factor> | null;
  return !!f && typeof f.nombre === "string" && typeof f.rut === "string";
};
const clave = (rut: string) => rut.replace(/[.\s]/g, "").toUpperCase();

/**
 * Factores guardados del tenant (ajuste `finanzas.factores_cesion`): elegir uno llena los datos de la cesión, y el
 * que se escribió a mano se puede guardar para la próxima vez.
 */
export function SelectorFactor({
  actual,
  onElegir,
}: {
  actual: Factor;
  onElegir: (factor: Factor) => void;
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [lista, setLista] = useState<Factor[]>([]);

  useEffect(() => {
    let cancelar = false;
    void ejecutar<Ajuste[]>("core.config.get", { modulo: "finanzas" }).then((r) => {
      if (cancelar) return;
      const valor = r?.find((a) => a.clave === "factores_cesion")?.valor;
      setLista(Array.isArray(valor) ? valor.filter(esFactor) : []);
    });
    return () => {
      cancelar = true;
    };
  }, [ejecutar]);

  const guardado = lista.find((f) => clave(f.rut) === clave(actual.rut));
  const cambio =
    !guardado ||
    guardado.nombre !== actual.nombre ||
    (guardado.email ?? "") !== (actual.email ?? "") ||
    (guardado.direccion ?? "") !== (actual.direccion ?? "");
  const puedeGuardar = actual.nombre.length > 0 && actual.rut.length >= 3 && cambio;

  async function guardar() {
    limpiarError();
    const nueva = [...lista.filter((f) => clave(f.rut) !== clave(actual.rut)), actual];
    const r = await ejecutar("core.config.set", { modulo: "finanzas", clave: "factores_cesion", valor: nueva });
    if (!r) return;
    setLista(nueva);
    avisar.exito("Factor guardado");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {lista.length > 0 ? (
        <div className="min-w-0 flex-1">
          <Select
            aria-label="Elegir un factor guardado"
            placeholder="Elegir un factor guardado"
            valor={guardado ? clave(guardado.rut) : undefined}
            onCambiar={(v) => {
              const f = lista.find((x) => clave(x.rut) === v);
              if (f) onElegir(f);
            }}
            opciones={lista.map((f) => ({ valor: clave(f.rut), etiqueta: f.nombre, descripcion: f.rut }))}
          />
        </div>
      ) : null}
      <Button variant="secondary" disabled={pendiente || !puedeGuardar} onClick={() => void guardar()}>
        {guardado ? "Actualizar factor" : "Guardar factor"}
      </Button>
      {error ? (
        <p role="alert" className="w-full text-sm text-danger-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}
