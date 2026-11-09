"use client";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** Trae a una cotización en borrador los costos predefinidos de la empresa que aún no tiene (CAR-213). */
export function BotonCargarPredefinidos({ versionId, bloqueado, onListo }: { versionId: string; bloqueado: boolean; onListo: () => void }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  async function cargar() {
    const r = await ejecutar<{ cargados: number }>("cpq.costos_categoria.cargar_predefinidos", { versionId });
    if (r == null) return;
    if (r.cargados > 0) avisar.exito(r.cargados === 1 ? "Se cargó 1 costo" : `Se cargaron ${r.cargados} costos`);
    else avisar.info("Sin cambios: ya estaban cargados.");
    onListo();
  }
  return (
    <div className="space-y-1">
      <Button type="button" variant="secondary" disabled={pendiente || bloqueado} onClick={() => void cargar()}>
        Cargar costos predefinidos
      </Button>
      <p className="t-caption text-fg-muted">{bloqueado ? "Guarda o descarta tus cambios antes de cargar los costos predefinidos." : "No pisa lo que ya editaste ni duplica costos."}</p>
      {error ? <p role="alert" className="t-caption text-danger-fg">{error}</p> : null}
    </div>
  );
}
