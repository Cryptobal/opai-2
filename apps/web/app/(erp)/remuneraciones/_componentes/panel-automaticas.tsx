"use client";

import { useState } from "react";

import { Alerta, avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Resultado = { generadas: number; yaExistentes: number; omitidas: { personaId: string; motivo: string }[] };

/**
 * Anticipo quincenal (B2) y cuotas de préstamo (B3): generan novedades del período de forma idempotente.
 * Primero una vista previa (dryRun) con lo que se crearía; recién al confirmar se guardan.
 */
export function PanelAutomaticas({ periodoId, anticipos, prestamos }: { periodoId: string; anticipos: boolean; prestamos: boolean }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [previa, setPrevia] = useState<{ id: "anticipos" | "prestamos"; r: Resultado } | null>(null);

  type Id = "anticipos" | "prestamos";
  async function ver(id: Id) {
    const r =
      id === "anticipos"
        ? await ejecutar<Resultado>("nomina.anticipos.generar", { periodoId }, true)
        : await ejecutar<Resultado>("nomina.prestamos.aplicar_cuotas", { periodoId }, true);
    if (r) setPrevia({ id, r });
  }
  async function confirmar() {
    if (!previa) return;
    const r =
      previa.id === "anticipos"
        ? await ejecutar<Resultado>("nomina.anticipos.generar", { periodoId })
        : await ejecutar<Resultado>("nomina.prestamos.aplicar_cuotas", { periodoId });
    if (r) {
      avisar.exito(r.generadas === 0 ? "No había nada nuevo que generar" : `${r.generadas} novedades generadas`);
      setPrevia(null);
    }
  }
  const omitidas = previa?.r.omitidas.length ?? 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {anticipos ? <Button variant="secondary" disabled={pendiente} onClick={() => void ver("anticipos")}>Generar anticipos del período</Button> : null}
        {prestamos ? <Button variant="secondary" disabled={pendiente} onClick={() => void ver("prestamos")}>Aplicar cuotas de préstamos</Button> : null}
      </div>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {previa ? (
        <Alerta
          tono="info"
          titulo={previa.r.generadas === 0 ? "No hay nada nuevo que generar" : `Se generarían ${previa.r.generadas} novedades`}
          accion={previa.r.generadas > 0 ? <Button disabled={pendiente} onClick={() => void confirmar()}>Confirmar</Button> : undefined}
        >
          {previa.r.yaExistentes} ya estaban cargadas.
          {omitidas > 0 ? ` ${omitidas} reglas se omiten: el anticipo por porcentaje espera al motor de sueldos.` : ""}
        </Alerta>
      ) : null}
    </div>
  );
}
