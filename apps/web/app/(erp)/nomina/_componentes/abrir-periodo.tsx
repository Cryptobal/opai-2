"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Dialog, Select } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { MES_LARGO } from "./etiquetas";

/** «Abrir período»: elige año y mes (por defecto el mes siguiente al último) y llama a la capacidad. */
export function AbrirPeriodo({ sugerido }: { sugerido: { anio: number; mes: number } }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);
  const [anio, setAnio] = useState(String(sugerido.anio));
  const [mes, setMes] = useState(String(sugerido.mes));
  const anios = [sugerido.anio - 1, sugerido.anio, sugerido.anio + 1].map((a) => ({ valor: String(a), etiqueta: String(a) }));

  async function abrir() {
    const r = await ejecutar("nomina.periodos.abrir", { anio: Number(anio), mes: Number(mes) });
    if (r) {
      avisar.exito("Período abierto");
      setAbierto(false);
    }
  }
  return (
    <>
      <Button onClick={() => (limpiarError(), setAbierto(true))}>Abrir período</Button>
      <Dialog
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="Abrir período"
        descripcion="Un mes tiene un solo período. Se crean también sus obligaciones del calendario."
        acciones={<Button disabled={pendiente} onClick={() => void abrir()}>Abrir</Button>}
      >
        <div className="flex gap-2">
          <Select aria-label="Mes" valor={mes} onCambiar={setMes} opciones={MES_LARGO.map((m, i) => ({ valor: String(i + 1), etiqueta: m }))} />
          <Select aria-label="Año" valor={anio} onCambiar={setAnio} opciones={anios} />
        </div>
        {error ? <Alerta tono="danger" titulo={error} className="mt-3" /> : null}
      </Dialog>
    </>
  );
}
