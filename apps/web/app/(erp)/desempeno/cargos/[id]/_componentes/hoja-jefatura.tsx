"use client";

import { useState } from "react";

import { avisar, Button, Campo, Select, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { type CargoJefatura, ETIQUETA_VE } from "../../../_componentes/tipos";

type Props = { cargo: CargoJefatura; cargos: CargoJefatura[]; onCerrar: () => void };

const SIN_JEFATURA = "ninguna";
const MODOS = (Object.keys(ETIQUETA_VE) as CargoJefatura["jefaturaVe"][]).map((valor) => ({
  valor,
  etiqueta: ETIQUETA_VE[valor],
}));

/** Hoja para cambiar la jefatura de un cargo (`core.cargos.set_jefatura`). */
export function HojaJefatura({ cargo, cargos, onCerrar }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [jefe, setJefe] = useState(cargo.jefaturaCargoId ?? SIN_JEFATURA);
  const [ve, setVe] = useState<string>(cargo.jefaturaVe);

  async function guardar() {
    const r = await ejecutar("core.cargos.set_jefatura", {
      id: cargo.id,
      jefaturaCargoId: jefe === SIN_JEFATURA ? null : jefe,
      jefaturaVe: ve,
    });
    if (!r) return;
    avisar.exito("Jefatura guardada");
    onCerrar();
  }

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo="Jefatura del cargo"
      acciones={
        <Button disabled={pendiente} onClick={() => void guardar()}>
          {pendiente ? "Guardando…" : "Guardar"}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Reporta a" htmlFor="jf-cargo" {...(error ? { error } : {})}>
          <Select
            id="jf-cargo"
            valor={jefe}
            opciones={[
              { valor: SIN_JEFATURA, etiqueta: "Nadie" },
              ...cargos
                .filter((c) => c.id !== cargo.id && (c.activo || c.id === cargo.jefaturaCargoId))
                .map((c) => ({ valor: c.id, etiqueta: c.nombre })),
            ]}
            onCambiar={setJefe}
          />
        </Campo>
        {jefe !== SIN_JEFATURA ? (
          <Campo etiqueta="Cada jefe ve" htmlFor="jf-ve">
            <Select id="jf-ve" valor={ve} opciones={MODOS} onCambiar={setVe} />
          </Campo>
        ) : null}
        <p className="t-caption">
          A quien no tiene jefe asignado lo ve el nivel de arriba. Gerencia ve a todas las personas.
        </p>
      </div>
    </Sheet>
  );
}
