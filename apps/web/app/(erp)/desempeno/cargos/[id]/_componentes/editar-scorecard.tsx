"use client";

import { lazy, Suspense, useState } from "react";

import { Button } from "@opai/ds";

import type { IndicadorOpcion, Scorecard } from "../../../_componentes/tipos";

const Hoja = lazy(() => import("./hoja-scorecard").then((m) => ({ default: m.HojaScorecard })));

type Props = {
  cargoId: string;
  base: Scorecard | null;
  soloPublicar: boolean;
  opciones: IndicadorOpcion[];
};

/** Botón que abre el editor del scorecard; la hoja se descarga al abrirla (ADR-037). */
export function EditarScorecard(props: Props) {
  // Cada apertura monta la hoja de nuevo: parte siempre de lo guardado, no de una edición descartada.
  const [apertura, setApertura] = useState(0);
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button
        onClick={() => {
          setApertura((n) => n + 1);
          setAbierto(true);
        }}
      >
        {props.base ? "Editar scorecard" : "Definir scorecard"}
      </Button>
      {abierto ? (
        <Suspense fallback={null}>
          <Hoja key={apertura} {...props} onCerrar={() => setAbierto(false)} />
        </Suspense>
      ) : null}
    </>
  );
}
