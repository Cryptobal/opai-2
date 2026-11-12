"use client";

import { lazy, Suspense, useState } from "react";

import { Button } from "@opai/ds";

import type { Hecho, Propio } from "../../_componentes/tipos";

const Hoja = lazy(() => import("./hoja-propio").then((m) => ({ default: m.HojaPropio })));

type Props = { propio: Propio | null; hechos: Hecho[] };

/** Botón que abre el editor de un indicador propio; la hoja se descarga al abrirla (ADR-037). */
export function EditarPropio({ propio, hechos }: Props) {
  // Cada apertura monta la hoja de nuevo: parte de lo guardado, no de una edición descartada.
  const [apertura, setApertura] = useState(0);
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button
        variant={propio ? "secondary" : "primary"}
        disabled={hechos.length === 0}
        aria-label={propio ? `Editar ${propio.nombre}` : undefined}
        onClick={() => {
          setApertura((n) => n + 1);
          setAbierto(true);
        }}
      >
        {propio ? "Editar" : "Nuevo indicador"}
      </Button>
      {abierto ? (
        <Suspense fallback={null}>
          <Hoja key={apertura} propio={propio} hechos={hechos} onCerrar={() => setAbierto(false)} />
        </Suspense>
      ) : null}
    </>
  );
}
