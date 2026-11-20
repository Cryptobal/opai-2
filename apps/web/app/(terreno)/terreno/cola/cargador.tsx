"use client";

import dynamic from "next/dynamic";

import { Loading } from "@opai/ds";

// Cola local aparte: lista, estado y sincronización pesan en un chunk propio (ADR-044).
const ColaPendiente = dynamic(
  () => import("../_componentes/cola-pendiente").then((m) => m.ColaPendiente),
  {
    ssr: false,
    loading: () => <Loading variante="lista" className="p-4" />,
  },
);

export function CargadorCola() {
  return <ColaPendiente />;
}