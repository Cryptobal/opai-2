"use client";

import dynamic from "next/dynamic";

import { Loading } from "@opai/ds";

import type { PersonaDeLista } from "@/lib/terreno-servidor";

// La pantalla del kiosco se carga aparte (presupuesto de JS Terreno, ADR-044).
const PantallaEquipo = dynamic(
  () => import("./pantalla-equipo").then((m) => m.PantallaEquipo),
  {
    ssr: false,
    loading: () => <Loading variante="lista" className="p-4" />,
  },
);

export function CargadorEquipo({
  instalacion,
  personas,
}: {
  instalacion: string;
  personas: PersonaDeLista[];
}) {
  return <PantallaEquipo instalacion={instalacion} personas={personas} />;
}