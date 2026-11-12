"use client";

import { useEffect, useState } from "react";

import { avisar } from "@opai/ds";

import { DialogoConfirmar } from "@/app/_components/maestros/dialogo-confirmar";
import { useCapacidad } from "@/app/_components/use-capacidad";

type Props = { periodo: string; mes: string; onCerrar: () => void };
type Resumen = { personas: number; cargos: number };

const FIJO =
  "Desde ahí no cambia aunque se corrija un dato, y el mes no se puede reabrir.";

function descripcion(r: Resumen | null): string {
  if (!r) return `Se guarda el resultado de cada persona con su cargo y scorecard de ese mes. ${FIJO}`;
  if (r.personas === 0) return `Este mes no tiene resultados: quedará cerrado vacío. ${FIJO}`;
  const personas = r.personas === 1 ? "1 persona" : `${r.personas} personas`;
  const cargos = r.cargos === 1 ? "1 cargo" : `${r.cargos} cargos`;
  return `Se guarda el resultado de ${personas} en ${cargos}. ${FIJO}`;
}

/** Confirmación de cierre del mes: se descarga al abrirla (ADR-037) y simula antes para mostrar qué queda fijo. */
export function ConfirmarCierre({ periodo, mes, onCerrar }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [resumen, setResumen] = useState<Resumen | null>(null);
  useEffect(() => {
    void ejecutar<Resumen>("desempeno.periodos.cerrar", { periodo }, true, "ninguna").then(setResumen);
  }, [ejecutar, periodo]);
  return (
    <DialogoConfirmar
      confirmacion={{
        titulo: `¿Cerrar ${mes}?`,
        descripcion: descripcion(resumen),
        boton: `Cerrar ${mes}`,
        peligro: true,
      }}
      pendiente={pendiente}
      error={error}
      onCerrar={onCerrar}
      onConfirmar={async () => {
        if (!(await ejecutar("desempeno.periodos.cerrar", { periodo }))) return;
        avisar.exito(`Listo: ${mes} quedó cerrado`);
        onCerrar();
      }}
    />
  );
}
