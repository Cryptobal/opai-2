"use client";

import { type ComponentType, lazy, Suspense } from "react";

import { useParametros } from "./maestros/use-url";

/**
 * Hoja (Sheet o Dialog abierto por URL) que se descarga solo cuando su parámetro está presente
 * (`?editar=1`, `?subir=1`): sus formularios no pesan en el JavaScript inicial de la ruta
 * (ADR-037). Al cerrarse (sin el parámetro) se desmonta.
 */
export function hojaDiferida<P extends object>(
  parametros: readonly string[],
  cargar: () => Promise<ComponentType<P>>,
) {
  const Hoja = lazy(() => cargar().then((c) => ({ default: c })));
  return function HojaDiferida(props: P) {
    const { valor } = useParametros();
    if (!parametros.some((p) => valor(p))) return null;
    return (
      <Suspense fallback={null}>
        <Hoja {...props} />
      </Suspense>
    );
  };
}
