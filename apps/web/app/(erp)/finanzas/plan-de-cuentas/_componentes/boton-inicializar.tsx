"use client";

import { Alerta, avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** Carga la plantilla chilena base del plan de cuentas (solo si el tenant aún no tiene plan). */
export function BotonInicializar() {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  async function cargar() {
    const r = await ejecutar<{ creadas: number }>("finanzas.plan.inicializar", {});
    if (r) avisar.exito(`Plan de cuentas creado con ${r.creadas} cuentas`);
  }
  return (
    <div className="flex flex-col items-center gap-3">
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <Button disabled={pendiente} onClick={() => void cargar()}>
        {pendiente ? "Cargando…" : "Cargar plantilla chilena"}
      </Button>
    </div>
  );
}
