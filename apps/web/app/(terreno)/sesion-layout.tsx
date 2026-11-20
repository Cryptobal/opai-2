import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { PortalLayout } from "@/app/_components/portal-layout";

const AvisoInstalar = dynamic(() =>
  import("@/app/_components/pwa/aviso-instalar").then((m) => m.AvisoInstalar),
);

/** Terreno con sesión (placeholder o futuras pantallas con shell ERP). */
export function SesionTerrenoLayout({ children }: { children: ReactNode }) {
  return (
    <PortalLayout portal="terreno">
      {children}
      <AvisoInstalar />
    </PortalLayout>
  );
}