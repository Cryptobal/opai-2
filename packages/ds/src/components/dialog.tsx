"use client";

import { lazy, Suspense, useState } from "react";

import type { DialogProps } from "./dialog-radix";
import type { SheetProps } from "./sheet-radix";

const DialogRadix = lazy(() => import("./dialog-radix").then((m) => ({ default: m.DialogRadix })));
const SheetRadix = lazy(() => import("./sheet-radix").then((m) => ({ default: m.SheetRadix })));

/** Monta el overlay recién la primera vez que se abre (carga diferida de Radix, ADR-037). */
function useMontado(abierto: boolean) {
  const [montado, setMontado] = useState(abierto);
  if (abierto && !montado) setMontado(true);
  return montado;
}

/**
 * Diálogo modal sobre Radix (ADR-017): foco atrapado, Escape y clic fuera cierran, título
 * accesible. Para confirmaciones, un dato que se muestra una sola vez y vistas previas.
 */
export function Dialog(props: DialogProps) {
  if (!useMontado(props.abierto)) return null;
  return (
    <Suspense fallback={null}>
      <DialogRadix {...props} />
    </Suspense>
  );
}

/**
 * Panel modal sobre Radix: inferior con asa en teléfono (o pantalla completa), lateral de 420 px
 * en md+. Cabecera con título y cerrar; pie con acciones. Única superficie con sombra.
 */
export function Sheet(props: SheetProps) {
  if (!useMontado(props.abierto)) return null;
  return (
    <Suspense fallback={null}>
      <SheetRadix {...props} />
    </Suspense>
  );
}
