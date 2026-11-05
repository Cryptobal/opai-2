"use client";

import { useState } from "react";

import { Button } from "@opai/ds";

import { BarraAcciones } from "./barra-acciones";
import { ConfirmarEnvio } from "./confirmar-envio";
import type { Cuerpo, useGuardado } from "./guardado";

/** Guardar borrador y Enviar a aprobación (con confirmación de aprobador y total); lo comparten compra y kilometraje. */
export function AccionesEnvio({
  g,
  cuerpo,
  validar,
  aprobadorId,
  aprobador,
  total,
  gastos,
}: {
  g: ReturnType<typeof useGuardado>;
  cuerpo: () => Cuerpo;
  /** Valida el formulario (y muestra sus errores); `enviar` pide además el aprobador. */
  validar: (enviar: boolean) => boolean;
  aprobadorId: string;
  aprobador: string;
  total: number;
  gastos: number;
}) {
  const [confirmando, setConfirmando] = useState(false);
  return (
    <>
      {g.error && !confirmando ? (
        <p role="alert" className="text-base font-medium text-danger-fg">
          {g.error}
        </p>
      ) : null}
      <BarraAcciones>
        <Button
          variant="secondary"
          disabled={g.ocupado !== null}
          onClick={() => validar(false) && void g.guardar(cuerpo())}
        >
          {g.ocupado === "guardar" ? "Guardando…" : "Guardar borrador"}
        </Button>
        <Button disabled={g.ocupado !== null} onClick={() => validar(true) && setConfirmando(true)}>
          Enviar a aprobación
        </Button>
      </BarraAcciones>
      <ConfirmarEnvio
        abierto={confirmando}
        onCerrar={() => setConfirmando(false)}
        aprobador={aprobador}
        total={total}
        gastos={gastos}
        ocupado={g.ocupado === "enviar"}
        error={g.error}
        onConfirmar={() => void g.enviar(cuerpo(), aprobadorId).then(() => setConfirmando(false))}
      />
    </>
  );
}
