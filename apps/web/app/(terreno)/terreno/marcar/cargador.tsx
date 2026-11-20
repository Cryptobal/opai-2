"use client";

import dynamic from "next/dynamic";

import { Loading } from "@opai/ds";

// Marcación con rostro/PIN aparte del JS de la ruta (presupuesto Terreno, ADR-044).
const MarcarEquipo = dynamic(
  () => import("../_componentes/marcar-equipo").then((m) => m.MarcarEquipo),
  {
    ssr: false,
    loading: () => <Loading variante="detalle" />,
  },
);

export function CargadorMarcar() {
  return <MarcarEquipo />;
}