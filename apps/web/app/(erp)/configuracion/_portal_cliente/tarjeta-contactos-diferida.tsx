"use client";

import { lazy, Suspense } from "react";

import { Loading } from "@opai/ds";

import type { ContactoAcceso } from "./contactos-acceso";

const Tarjeta = lazy(() => import("./tarjeta-contactos-acceso").then((m) => ({ default: m.TarjetaContactosAcceso })));

/** Se descarga aparte para no sumar JS de entrada a la ficha de la cuenta (ADR-037). */
export function TarjetaContactosDiferida(props: { cuentaId: string; contactos: ContactoAcceso[]; puedeGestionar: boolean }) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <Tarjeta {...props} />
    </Suspense>
  );
}
