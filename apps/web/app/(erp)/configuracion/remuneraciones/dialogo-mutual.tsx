"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Dialog, Input } from "@opai/ds";
import { PCT_ESCALA } from "@opai/domain";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  tasaActual: number | null;
  onGuardada: () => void;
};

function parseTasa(raw: string): { ok: true; escalada: number } | { ok: false; mensaje: string } {
  const limpio = raw.trim().replace(",", ".");
  if (!limpio) return { ok: false, mensaje: "Ingresa la tasa adicional." };
  const n = Number(limpio);
  if (!Number.isFinite(n) || n < 0) return { ok: false, mensaje: "Usa un número mayor o igual a 0." };
  if (n > 100) return { ok: false, mensaje: "La tasa no puede superar 100 %." };
  const escalada = Math.round(n * (PCT_ESCALA / 100));
  if (escalada > PCT_ESCALA) return { ok: false, mensaje: "La tasa supera el máximo permitido." };
  return { ok: true, escalada };
}

function tasaInicial(escalada: number | null): string {
  return escalada != null ? (escalada / (PCT_ESCALA / 100)).toFixed(2).replace(".", ",") : "";
}

export function DialogoMutual({ abierto, onCerrar, tasaActual, onGuardada }: Props) {
  const { ejecutar, error, pendiente, limpiarError } = useCapacidad("erp");
  const [validacion, setValidacion] = useState<string | null>(null);

  const cerrar = () => {
    setValidacion(null);
    limpiarError();
    onCerrar();
  };

  async function guardar(texto: string) {
    const parsed = parseTasa(texto);
    if (!parsed.ok) {
      setValidacion(parsed.mensaje);
      return;
    }
    setValidacion(null);
    const previa = await ejecutar(
      "core.remuneraciones.confirmar_mutual",
      { tasaEscalada: parsed.escalada },
      true,
    );
    if (previa == null) return;
    const r = await ejecutar("core.remuneraciones.confirmar_mutual", {
      tasaEscalada: parsed.escalada,
    });
    if (r == null) return;
    avisar.exito("Tasa adicional de la mutual actualizada");
    onGuardada();
    cerrar();
  }

  if (!abierto) return null;

  return (
    <DialogoMutualForm
      key={tasaActual ?? "nueva"}
      tasaInicial={tasaInicial(tasaActual)}
      error={error}
      validacion={validacion}
      pendiente={pendiente}
      onCerrar={cerrar}
      onGuardar={(texto) => void guardar(texto)}
      onEditar={() => setValidacion(null)}
    />
  );
}

function DialogoMutualForm({
  tasaInicial: inicial,
  error,
  validacion,
  pendiente,
  onCerrar,
  onGuardar,
  onEditar,
}: {
  tasaInicial: string;
  error: string | null;
  validacion: string | null;
  pendiente: boolean;
  onCerrar: () => void;
  onGuardar: (texto: string) => void;
  onEditar: () => void;
}) {
  const [texto, setTexto] = useState(inicial);

  return (
    <Dialog
      abierto
      onCerrar={onCerrar}
      titulo="Editar tasa adicional"
      descripcion="Cotización adicional de la mutual según la resolución de tu empresa (porcentaje con coma decimal)."
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente} onClick={() => onGuardar(texto)}>
            {pendiente ? "Guardando…" : "Confirmar tasa"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {validacion ? <Alerta tono="danger" titulo={validacion} /> : null}
        <Campo etiqueta="Tasa adicional (%)" htmlFor="mutual-tasa" ayuda="Ejemplo: 0,27">
          <Input
            id="mutual-tasa"
            inputMode="decimal"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              onEditar();
            }}
          />
        </Campo>
      </div>
    </Dialog>
  );
}
