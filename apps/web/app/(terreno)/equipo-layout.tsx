import dynamic from "next/dynamic";
import type { ReactNode } from "react";

// Kiosco sin sesión: sin PortalLayout del ERP (solo PWA), para no sumar shell al presupuesto (ADR-044).
const AvisoInstalar = dynamic(() =>
  import("@/app/_components/pwa/aviso-instalar").then((m) => m.AvisoInstalar),
);

export function EquipoTerrenoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <AvisoInstalar />
    </>
  );
}