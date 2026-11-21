"use client";

import { Button } from "@opai/ds";

import type { TurnoEstado } from "../../_componentes/tipos-central";

type Props = {
  turno: TurnoEstado;
  operador: string | null;
  entregaPara: string | null;
  atender: boolean;
  pendiente: boolean;
  onAbrir: () => void;
  onCerrar: () => void;
  onAceptar: () => void;
};

export function BotonesTurno({ turno, operador, entregaPara, atender, pendiente, onAbrir, onCerrar, onAceptar }: Props) {
  if (!atender) return null;
  const t = turno.turno;
  const yoOpero = t && operador && t.operadorId === operador && t.estado === "abierto";
  const entregaAMi = t && entregaPara && t.entregaAId === entregaPara && t.estado === "en_entrega";
  return (
    <div className="flex flex-wrap gap-2">
      {!t ? (
        <Button variant="primary" disabled={pendiente} onClick={onAbrir}>
          Abrir turno
        </Button>
      ) : null}
      {yoOpero ? (
        <Button variant="secondary" disabled={pendiente} onClick={onCerrar}>
          Cerrar turno
        </Button>
      ) : null}
      {entregaAMi ? (
        <Button variant="primary" disabled={pendiente} onClick={onAceptar}>
          Aceptar turno
        </Button>
      ) : null}
    </div>
  );
}