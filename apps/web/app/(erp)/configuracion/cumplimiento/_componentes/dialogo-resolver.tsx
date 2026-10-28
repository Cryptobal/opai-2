"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Dialog, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Props = {
  id: string;
  estado: "resuelta" | "rechazada";
  evidencia: string | null;
  onCerrar: () => void;
};

/** Resolver o rechazar una solicitud con su resultado; adjunta la exportación como evidencia. */
export function DialogoResolver({ id, estado, evidencia, onCerrar }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [resultado, setResultado] = useState("");
  const resolver = estado === "resuelta";
  async function confirmar() {
    const r = await ejecutar("core.cumplimiento.solicitud_resolver", {
      id,
      estado,
      resultado: resultado.trim(),
      ...(evidencia ? { documentoEvidenciaId: evidencia } : {}),
    });
    if (!r) return;
    avisar.exito(resolver ? "Solicitud resuelta" : "Solicitud rechazada");
    onCerrar();
  }
  return (
    <Dialog
      abierto
      onCerrar={onCerrar}
      titulo={resolver ? "Resolver la solicitud" : "Rechazar la solicitud"}
      descripcion={
        resolver
          ? "Describe qué se hizo. Queda en la auditoría como prueba de la atención."
          : "Explica por qué se rechaza (p. ej. no se pudo verificar la identidad)."
      }
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            variant={resolver ? "primary" : "destructive"}
            disabled={pendiente || resultado.trim().length < 3}
            onClick={() => void confirmar()}
          >
            {resolver ? "Resolver" : "Rechazar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta={resolver ? "Resultado" : "Motivo"} htmlFor="sol-resultado">
          <Textarea
            id="sol-resultado"
            rows={4}
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
          />
        </Campo>
        {evidencia ? (
          <p className="t-caption">Se adjunta la exportación generada como evidencia.</p>
        ) : null}
      </div>
    </Dialog>
  );
}
