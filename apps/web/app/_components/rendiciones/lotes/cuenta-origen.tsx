"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Button, Campo, Select } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

export type CuentaOrigen = { id: string; banco: string; numeroVisible: string };

/** Cuenta de origen de la nómina: se elige entre las cuentas ya ingresadas en Bancos (nunca texto libre). */
export function SelectorCuentaOrigen({ cuentas, seleccionadaId }: { cuentas: readonly CuentaOrigen[]; seleccionadaId: string }) {
  const router = useRouter();
  const [valor, setValor] = useState(seleccionadaId);
  const [ocupado, setOcupado] = useState(false);
  async function guardar() {
    setOcupado(true);
    const r = await ejecutarCapacidad("erp", "core.config.set", { modulo: "rendiciones", clave: "nomina_cuenta_origen_id", valor });
    setOcupado(false);
    if (!r.ok) return avisar.error(r.error.message);
    avisar.exito("Cuenta de origen guardada");
    router.refresh();
  }
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-end">
      <Campo etiqueta="Cuenta de origen de la nómina" htmlFor="cuenta-origen" ayuda="Se elige entre las cuentas ingresadas en Bancos." className="md:flex-1">
        <Select
          id="cuenta-origen"
          aria-label="Cuenta de origen de la nómina"
          valor={valor}
          onCambiar={setValor}
          placeholder="Elige una cuenta"
          opciones={cuentas.map((c) => ({ valor: c.id, etiqueta: `${c.banco} · ${c.numeroVisible}` }))}
        />
      </Campo>
      <Button variant="secondary" disabled={ocupado || valor === seleccionadaId || valor === ""} onClick={() => void guardar()}>
        {ocupado ? "Guardando…" : "Guardar cuenta"}
      </Button>
    </div>
  );
}
