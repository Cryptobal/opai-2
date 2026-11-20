"use client";

import dynamic from "next/dynamic";

import { Loading } from "@opai/ds";

// Toda la pantalla se carga aparte: la ruta casi no suma al JS inicial de Terreno (presupuesto de JS, ADR-037/044).
const PantallaLibro = dynamic(() => import("./pantalla-libro").then((m) => m.PantallaLibro), {
  ssr: false,
  loading: () => <Loading variante="lista" className="p-4" />,
});

/** Monta el libro de novedades del equipo de terreno en el navegador (CAR-77 parte 3). */
export function CargadorLibro() {
  return <PantallaLibro />;
}
