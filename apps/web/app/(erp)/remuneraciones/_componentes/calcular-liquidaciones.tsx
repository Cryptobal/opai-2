"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { pesos } from "./etiquetas";

type Resultado = { calculadas: number; omitidas: { personaId: string; motivo: string }[]; totalLiquido: number; advertencias: string[] };

/** Calcula las liquidaciones del período: primero la vista previa (dryRun), después se confirma. */
export function CalcularLiquidaciones({ periodoId }: { periodoId: string }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const router = useRouter();
  const [previa, setPrevia] = useState<Resultado | null>(null);
  async function ver() {
    const r = await ejecutar<Resultado>("nomina.liquidaciones.calcular", { periodoId }, true);
    if (r) setPrevia(r);
  }
  async function confirmar() {
    const r = await ejecutar<Resultado>("nomina.liquidaciones.calcular", { periodoId });
    if (r) {
      avisar.exito(`${r.calculadas} liquidaciones calculadas`);
      setPrevia(null);
      router.refresh();
    }
  }
  return (
    <div className="flex flex-col gap-3">
      <Button className="self-start" disabled={pendiente} onClick={() => void ver()}>
        Calcular liquidaciones
      </Button>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {previa ? (
        <Alerta
          tono="info"
          titulo={`Se calcularían ${previa.calculadas} liquidaciones por ${pesos(previa.totalLiquido)} líquido`}
          accion={previa.calculadas > 0 ? <Button disabled={pendiente} onClick={() => void confirmar()}>Confirmar</Button> : undefined}
        >
          {previa.omitidas.length > 0
            ? `${previa.omitidas.length} personas quedan fuera porque no tienen estructura de sueldo completa o visible.`
            : "Todas las personas con contrato vigente tienen su liquidación."}
          {previa.advertencias.map((a) => ` ${a}`).join("")}
        </Alerta>
      ) : null}
    </div>
  );
}
