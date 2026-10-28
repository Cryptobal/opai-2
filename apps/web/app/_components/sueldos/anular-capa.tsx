"use client";

import { useState } from "react";
import { Alerta, avisar, Button, Campo, Dialog, Textarea } from "@opai/ds";
import { useCapacidad } from "../use-capacidad";

export function AnularCapa({ id, alCerrar }: { id: string; alCerrar: () => void }) {
  const [abierto, abrir] = useState(true);
  const [motivo, cambiar] = useState("");
  const [preview, revisar] = useState(false);
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  async function confirmar() {
    const r = await ejecutar("core.estructuras.anular", { id, motivo }, !preview);
    if (!r) return;
    if (!preview) revisar(true);
    else {
      avisar.exito("Versión anulada");
      abrir(false);
      revisar(false);
      cambiar("");
      alCerrar();
    }
  }
  return (
    <>
      <Dialog
        abierto={abierto}
        onCerrar={() => {
          abrir(false);
          revisar(false);
          alCerrar();
        }}
        titulo="Anular versión de sueldo"
        descripcion="No se reabre la versión anterior. Si existe otra capa vigente, podrá regir completa; nunca se mezclan conceptos."
        acciones={
          <>
            <Button
              variant="secondary"
              disabled={pendiente}
              onClick={() => {
                abrir(false);
                revisar(false);
                alCerrar();
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={pendiente || motivo.trim().length < 5}
              onClick={() => void confirmar()}
            >
              {preview ? "Confirmar anulación" : "Revisar anulación"}
            </Button>
          </>
        }
      >
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Motivo obligatorio" htmlFor={`anular-${id}`}>
          <Textarea
            id={`anular-${id}`}
            value={motivo}
            disabled={pendiente || preview}
            onChange={(e) => cambiar(e.target.value)}
          />
        </Campo>
        {preview ? (
          <Alerta tono="warning" titulo="La versión quedará anulada">
            El cambio se registra con su motivo y emite el evento para el futuro anexo.
          </Alerta>
        ) : null}
      </Dialog>
    </>
  );
}
