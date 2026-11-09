"use client";

import { Button, Campo, Select, TecladoPin } from "@opai/ds";

import { MOTIVOS } from "./etiquetas";

/**
 * RUT + PIN (D-02): el mecanismo secundario, sin biometría y siempre disponible. Si la marca cae aquí desde
 * el rostro, se guarda por qué (`motivo_respaldo`).
 */
export function MarcarPin({
  pin, onPin, motivo, onMotivo, pideMotivo, pendiente, onMarcar,
}: {
  pin: string; onPin: (v: string) => void; motivo: string; onMotivo: (v: string) => void;
  pideMotivo: boolean; pendiente: boolean; onMarcar: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {pideMotivo ? (
        <Campo etiqueta="¿Por qué marcas con PIN?" htmlFor="motivo-respaldo">
          <Select id="motivo-respaldo" valor={motivo} onCambiar={onMotivo} opciones={MOTIVOS.map((m) => ({ valor: m.valor, etiqueta: m.etiqueta }))} />
        </Campo>
      ) : null}
      <div className="flex flex-col items-center gap-2">
        <span className="t-label text-fg">Tu PIN de 6 dígitos</span>
        <TecladoPin valor={pin} onCambiar={onPin} disabled={pendiente} etiqueta="PIN de terreno" />
      </div>
      <Button size="lg" block onClick={onMarcar} disabled={pendiente || pin.length < 6}>
        {pendiente ? "Marcando…" : "Marcar con PIN"}
      </Button>
    </div>
  );
}

/** El PIN del kiosco para las acciones sobre el rostro (consentir, enrolar): la persona se identifica con él. */
export function PinParaEnrolar({ pin, onPin }: { pin: string; onPin: (v: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="t-label text-fg">Confirma con tu PIN de 6 dígitos</span>
      <TecladoPin valor={pin} onCambiar={onPin} etiqueta="PIN de terreno" />
    </div>
  );
}
