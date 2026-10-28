"use client";

import { useState } from "react";

import { Alerta } from "../acceso/alerta";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { Campo, Textarea } from "./input";

export type EstadoResuelto = {
  estado: "aprobado" | "rechazado";
  por: string | null;
  en: string | null;
  motivoRechazo?: string | null;
};

/**
 * Panel de aprobación del anexo (R13-R14, D14): aprobar genera el documento final; rechazar pide
 * motivo obligatorio. Ningún agente ve "Aprobar" como acción directa (soloPersonas, ADR-032): el
 * llamador decide si lo muestra según el actor.
 */
export function PanelAprobacion({
  resuelto,
  pendiente,
  error,
  onAprobar,
  onRechazar,
}: {
  resuelto?: EstadoResuelto | null;
  pendiente: boolean;
  error: string | null;
  onAprobar: () => void | Promise<void>;
  onRechazar: (motivo: string) => void | Promise<void>;
}) {
  const [rechazar, setRechazar] = useState(false);
  const [motivo, setMotivo] = useState("");
  if (resuelto) {
    return (
      <Alerta
        tono={resuelto.estado === "aprobado" ? "success" : "danger"}
        titulo={resuelto.estado === "aprobado" ? "Anexo aprobado" : "Anexo rechazado"}
      >
        {resuelto.estado === "rechazado" && resuelto.motivoRechazo
          ? resuelto.motivoRechazo
          : null}
      </Alerta>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {error && !rechazar ? <Alerta tono="danger" titulo={error} /> : null}
      <div className="grid grid-cols-2 gap-3 [&>*]:h-11">
        <Button variant="secondary" disabled={pendiente} onClick={() => setRechazar(true)}>
          Rechazar
        </Button>
        <Button disabled={pendiente} onClick={() => void onAprobar()}>
          Aprobar
        </Button>
      </div>
      <Dialog
        abierto={rechazar}
        onCerrar={() => setRechazar(false)}
        titulo="Rechazar el anexo"
        descripcion="Quien generó el cambio verá el motivo."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setRechazar(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pendiente || motivo.trim().length < 3}
              onClick={() => void onRechazar(motivo.trim())}
            >
              Rechazar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {error && rechazar ? <Alerta tono="danger" titulo={error} /> : null}
          <Campo etiqueta="Motivo" htmlFor="anexo-rechazo-motivo">
            <Textarea
              id="anexo-rechazo-motivo"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </Campo>
        </div>
      </Dialog>
    </div>
  );
}
