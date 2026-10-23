"use client";

import { lazy, Suspense, useState } from "react";

import type { PopoverProps } from "./popover-radix";

const PopoverRadix = lazy(() =>
  import("./popover-radix").then((m) => ({ default: m.PopoverRadix })),
);

/**
 * Panel anclado (Radix) con carga diferida: hasta el primer clic solo existe el disparador
 * (ADR-037). Al activarse se abre y avisa `onCambiar(true)`.
 */
export function Popover(props: PopoverProps) {
  const [activo, setActivo] = useState(false);
  if (!activo)
    return (
      <span
        className="contents"
        onClickCapture={() => {
          setActivo(true);
          props.onCambiar?.(true);
        }}
      >
        {props.disparador}
      </span>
    );
  return (
    <Suspense fallback={props.disparador}>
      <PopoverRadix {...props} abiertoInicial />
    </Suspense>
  );
}
