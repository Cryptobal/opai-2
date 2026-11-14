"use client";
import { useState } from "react";
import { Alerta, avisar, Button, Campo, Input, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

/**
 * Anula el último período del contrato cuando se registró mal (CAR-409). No se borra: queda con el
 * motivo y quién lo anuló, y el contrato vuelve al período anterior.
 */
export function HojaAnularPeriodo({
  personaId,
  periodoId,
  descripcion,
}: {
  personaId: string;
  periodoId: string;
  /** Texto del período a anular («2.º plazo fijo, del … al …»). */
  descripcion: string;
}) {
  const hoja = useHojaUrl("anular-periodo");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [motivo, setMotivo] = useState("");
  const invalido = motivo.trim().length < 3;
  async function anular() {
    const r = await ejecutar("core.personas.periodos_anular", {
      id: personaId,
      periodoId,
      motivo: motivo.trim(),
    });
    if (!r) return;
    avisar.exito("Período anulado");
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Anular último período"
      telefono="completo"
      acciones={
        <>
          <Button variant="secondary" disabled={pendiente} onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={pendiente || invalido}
            onClick={() => void anular()}
          >
            {pendiente ? "Anulando…" : "Anular período"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4" aria-busy={pendiente}>
        <Alerta tono="warning" titulo={descripcion}>
          El período queda en la historia como anulado, con el motivo. El contrato vuelve al período
          anterior.
        </Alerta>
        {error ? (
          <Alerta tono="danger" titulo="No se pudo anular">
            {error}
          </Alerta>
        ) : null}
        <Campo etiqueta="Motivo" htmlFor="periodo-motivo">
          <Input
            id="periodo-motivo"
            value={motivo}
            maxLength={300}
            disabled={pendiente}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Campo>
      </div>
    </Sheet>
  );
}
