"use client";

import dynamic from "next/dynamic";

import { Loading } from "@opai/ds";

// En el kiosco no hace falta el shell de PaginaPortal; solo el listado (ADR-044).
const CargaNovedades = dynamic(
  () => import("@/app/_components/novedades/carga-novedades").then((m) => m.CargaNovedades),
  {
    ssr: false,
    loading: () => <Loading variante="lista" className="p-4" />,
  },
);

export function CargadorNovedadesTerreno() {
  return (
    <main className="mx-auto w-full max-w-md px-4 pt-safe pb-safe py-6">
      <h1 className="t-title mb-4 text-fg">Novedades</h1>
      <CargaNovedades portal="terreno" />
    </main>
  );
}