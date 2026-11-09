"use client";

import dynamic from "next/dynamic";

import { Loading } from "@opai/ds";

// Toda la pantalla se carga aparte: la ruta casi no suma al JS inicial de Terreno (presupuesto de JS, ADR-037/044).
const PantallaRondas = dynamic(() => import("./pantalla-rondas").then((m) => m.PantallaRondas), {
  ssr: false,
  loading: () => <Loading variante="lista" className="p-4" />,
});

/** Monta «Mis rondas» del equipo de terreno en el navegador (CAR-78 · E3e). */
export function CargadorRondas() {
  return <PantallaRondas />;
}
