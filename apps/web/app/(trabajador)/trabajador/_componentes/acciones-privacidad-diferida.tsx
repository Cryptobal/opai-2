"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@opai/ds";

import type { Privacidad } from "./tipos";

// ARCO y portabilidad van aparte del primer JS de Privacidad (ADR-037): el trabajador suele leer DPO y tratamiento antes.
const Acciones = dynamic(
  () => import("./formulario-privacidad").then((m) => ({ default: m.AccionesPrivacidad })),
  { ssr: false, loading: () => <Skeleton className="h-28 w-full" /> },
);

export function AccionesPrivacidadDiferidas({
  solicitudesIniciales,
}: {
  solicitudesIniciales: Privacidad["solicitudes"];
}) {
  return <Acciones solicitudesIniciales={solicitudesIniciales} />;
}
