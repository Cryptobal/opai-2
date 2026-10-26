import type { ReactNode } from "react";

import { CargaPortal } from "@/app/_components/carga-portal";
import { AvisoInstalar } from "@/app/_components/pwa/aviso-instalar";

// Route group del portal "supervisor". Sesión y membresía con el portal se verifican en cada página.
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <CargaPortal>
      {children}
      <AvisoInstalar />
    </CargaPortal>
  );
}
