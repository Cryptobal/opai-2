"use client";

import dynamic from "next/dynamic";

import { useParametros } from "@/app/_components/maestros/use-url";

const Hoja = dynamic(() =>
  import("./hoja-registrar-ausencia").then((m) => ({ default: m.HojaRegistrarAusencia })),
);

/** La hoja de registrar se descarga recién al abrirla (`?registrar=1`): la pestaña queda dentro del tope de JS (ADR-037). */
export function HojaRegistrarDiferida(props: {
  personaId: string;
  nombre: string;
  hoy: string;
  conPauta: boolean;
}) {
  return useParametros().valor("registrar") !== null ? <Hoja {...props} /> : null;
}
