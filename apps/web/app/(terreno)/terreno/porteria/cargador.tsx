"use client";

import dynamic from "next/dynamic";

import { Loading } from "@opai/ds";

// Toda la pantalla se carga aparte: la ruta casi no suma al JS inicial de Terreno (presupuesto de JS, ADR-037/044).
const PantallaPorteria = dynamic(
  () => import("./pantalla-porteria").then((m) => m.PantallaPorteria),
  {
    ssr: false,
    loading: () => <Loading variante="lista" className="p-4" />,
  },
);

/** Monta la portería del equipo de terreno en el navegador (CAR-78 · E4d). */
export function CargadorPorteria() {
  return <PantallaPorteria />;
}
