import type { ReactNode } from "react";

import { identidadActual } from "@/lib/servidor";

import { EquipoTerrenoLayout } from "./equipo-layout";

/** Equipo emparejado sin sesión: layout liviano. Con sesión: shell del portal Terreno (ADR-045/044). */
export default async function Layout({ children }: { children: ReactNode }) {
  if (await identidadActual()) {
    const { SesionTerrenoLayout } = await import("./sesion-layout");
    return <SesionTerrenoLayout>{children}</SesionTerrenoLayout>;
  }
  return <EquipoTerrenoLayout>{children}</EquipoTerrenoLayout>;
}