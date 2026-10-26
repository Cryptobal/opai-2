import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { CargaPortal } from "@/app/_components/carga-portal";

// Aparte (next/dynamic): el aviso de instalar no pesa en el primer JS de la ruta de terreno (ADR-037).
const AvisoInstalar = dynamic(() =>
  import("@/app/_components/pwa/aviso-instalar").then((m) => m.AvisoInstalar),
);

// Route group del portal "supervisor". Sesión y membresía con el portal se verifican en cada página.
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <CargaPortal>
      {children}
      <AvisoInstalar />
    </CargaPortal>
  );
}
