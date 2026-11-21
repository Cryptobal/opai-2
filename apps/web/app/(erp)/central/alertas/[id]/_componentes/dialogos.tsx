"use client";

import { Button, Dialog } from "@opai/ds";

import { type Confirmacion, DialogoConfirmar } from "@/app/_components/maestros/dialogo-confirmar";

export type ConNota = "resolver" | "falsa_alarma" | "reabrir";

type Props = {
  dialogo: ConNota | "posponer";
  pendiente: boolean;
  error: string | null;
  onCerrar: () => void;
  onNota: (accion: ConNota, nota: string, exito: string) => void;
  onPosponer: (minutos: number) => void;
};

const PLAZOS = [
  { minutos: 15, etiqueta: "15 minutos" },
  { minutos: 60, etiqueta: "1 hora" },
  { minutos: 240, etiqueta: "4 horas" },
  { minutos: 1440, etiqueta: "24 horas" },
];

const CONFIRMACION: Record<ConNota, Confirmacion & { exito: string }> = {
  resolver: { titulo: "Resolver alerta", descripcion: "Cuenta qué se hizo: queda en la bitácora.", boton: "Resolver", motivo: true, motivoEtiqueta: "Qué se hizo", exito: "Alerta resuelta" },
  falsa_alarma: { titulo: "Cerrar como falsa alarma", descripcion: "Cuenta por qué no era real.", boton: "Falsa alarma", motivo: true, motivoEtiqueta: "Motivo", exito: "Cerrada como falsa alarma" },
  reabrir: { titulo: "Reabrir alerta", descripcion: "Vuelve a la cola en atención, con su historial.", boton: "Reabrir", motivo: true, motivoEtiqueta: "Qué evidencia nueva hay", exito: "Alerta reabierta" },
};

/** Diálogos de la ficha de la alerta: se descargan solo al abrir uno (ADR-037). */
export default function DialogosAlerta({ dialogo, pendiente, error, onCerrar, onNota, onPosponer }: Props) {
  if (dialogo !== "posponer") {
    const c = CONFIRMACION[dialogo];
    return (
      <DialogoConfirmar
        confirmacion={c}
        pendiente={pendiente}
        error={error}
        onCerrar={onCerrar}
        onConfirmar={(motivo) => onNota(dialogo, motivo?.trim() ?? "", c.exito)}
      />
    );
  }
  return (
    <Dialog
      abierto
      onCerrar={onCerrar}
      titulo="Posponer alerta"
      descripcion="Sale de la cola y vuelve sola al cumplirse el plazo."
      acciones={
        <Button variant="secondary" disabled={pendiente} onClick={onCerrar}>
          Cancelar
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {PLAZOS.map((p) => (
          <Button key={p.minutos} variant="secondary" disabled={pendiente} onClick={() => onPosponer(p.minutos)}>
            {p.etiqueta}
          </Button>
        ))}
      </div>
      {error ? <p className="mt-3 text-base text-danger">{error}</p> : null}
    </Dialog>
  );
}
