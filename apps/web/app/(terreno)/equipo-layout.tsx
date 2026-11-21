"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { ProveedorContextoTerreno } from "./terreno/_componentes/contexto-terreno";
import { NavegacionTerreno } from "./terreno/_componentes/navegacion-terreno";

// Kiosco sin sesión: sin PortalLayout del ERP (solo PWA), para no sumar shell al presupuesto (ADR-044).
const AvisoInstalar = dynamic(() =>
  import("@/app/_components/pwa/aviso-instalar").then((m) => m.AvisoInstalar),
);

export function EquipoTerrenoLayout({ children }: { children: ReactNode }) {
  return (
    <ProveedorContextoTerreno>
      <div className="min-h-dvh pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]">{children}</div>
      <NavegacionTerreno />
      <AvisoInstalar />
    </ProveedorContextoTerreno>
  );
}