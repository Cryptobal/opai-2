"use client";

import { type ComponentType, lazy, Suspense, useEffect } from "react";

import { avisar } from "@opai/ds";

import { cargaRepetible } from "./carga-repetible";
import { useParametros } from "./maestros/use-url";

/** Se muestra si el módulo de la hoja no se pudo descargar: avisa y no tumba la pantalla. */
function HojaNoDescargada() {
  useEffect(() => {
    avisar.error("No se pudo abrir el panel. Revisa tu conexión y vuelve a intentarlo.");
  }, []);
  return null;
}

/**
 * Hoja (Sheet o Dialog abierto por URL) que se descarga solo cuando su parámetro está presente
 * (`?editar=1`, `?subir=1`): sus formularios no pesan en el JavaScript inicial de la ruta
 * (ADR-037). Al cerrarse (sin el parámetro) se desmonta.
 *
 * `lazy` guarda para siempre el resultado de su primera carga: un chunk que falla (despliegue nuevo,
 * red) dejaba la hoja rota hasta recargar la página. Aquí un fallo se reintenta una vez, se avisa
 * sin romper la pantalla y se crea un `lazy` nuevo, para que la siguiente apertura vuelva a intentar.
 */
export function hojaDiferida<P extends object>(
  parametros: readonly string[],
  cargar: () => Promise<ComponentType<P>>,
) {
  const nueva = () =>
    lazy(() =>
      cargaRepetible(cargar).then(
        (c) => ({ default: c }),
        () => {
          Hoja = nueva();
          return { default: HojaNoDescargada as ComponentType<P> };
        },
      ),
    );
  let Hoja = nueva();
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
