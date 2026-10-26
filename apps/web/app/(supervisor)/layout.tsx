import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { PortalLayout } from "@/app/_components/portal-layout";

// Aparte (next/dynamic): el aviso de instalar no pesa en el primer JS de la ruta de supervisor (ADR-037).
const AvisoInstalar = dynamic(() =>
  import("@/app/_components/pwa/aviso-instalar").then((m) => m.AvisoInstalar),
);

// Route group del portal "supervisor": el shell persiste en el layout (ADR-045); la página solo trae su
// contenido. El aviso de instalar (PWA) acompaña al contenido del portal.
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <PortalLayout portal="supervisor">
      {children}
      <AvisoInstalar />
    </PortalLayout>
  );
}
