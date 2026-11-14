"use client";

import { useState } from "react";

import { Alerta, avisar, Campo, Input, Segmentado, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { AccionesHoja } from "./acciones-hoja";
import type { Entrega } from "./tipos";

/** Devolución de una entrega (R22): el activo vuelve disponible o a reparación; la ropa, al stock. */
export function HojaDevolver({ entregas }: { entregas: Entrega[] }) {
  const hoja = useHojaUrl("devolver");
  const entrega = entregas.find((x) => x.id === hoja.valor);
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [estado, setEstado] = useState<"disponible" | "en_reparacion">("disponible");
  const [nota, setNota] = useState("");

  async function guardar() {
    if (!entrega) return;
    const input = { id: entrega.id, ...(entrega.clase === "activo" ? { estadoActivo: estado } : {}), ...(nota.trim() ? { nota: nota.trim() } : {}) };
    if (!(await ejecutar("inventario.entregas.devolver", input))) return;
    avisar.exito("Devolución registrada");
    hoja.cerrar();
  }

  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Registrar devolución"
      acciones={<AccionesHoja onCancelar={hoja.cerrar} onGuardar={() => void guardar()} listo={Boolean(entrega)} pendiente={pendiente} texto="Devolver" />}
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {entrega ? (
          <p>
            <span className="font-medium">{entrega.cantidad ? `${entrega.cantidad} × ${entrega.item}` : entrega.item}</span>
            <span className="text-fg-muted"> · {entrega.destino}</span>
          </p>
        ) : (
          <Alerta tono="neutral" titulo="Esta entrega ya no está abierta." />
        )}
        {entrega?.clase === "activo" ? (
          <Segmentado
            etiqueta="Cómo vuelve"
            activa={estado}
            opciones={[
              { id: "disponible", etiqueta: "Bien", onClick: () => setEstado("disponible") },
              { id: "en_reparacion", etiqueta: "Dañado", onClick: () => setEstado("en_reparacion") },
            ]}
          />
        ) : null}
        <Campo etiqueta="Nota" htmlFor="dv-nota">
          <Input id="dv-nota" value={nota} onChange={(x) => setNota(x.target.value)} />
        </Campo>
      </div>
    </Sheet>
  );
}
