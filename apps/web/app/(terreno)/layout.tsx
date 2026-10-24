import type { ReactNode } from "react";

import { CargaPortal } from "@/app/_components/carga-portal";

// Route group del portal "terreno". Sesión y membresía con el portal se verifican en cada página.
export default function Layout({ children }: { children: ReactNode }) {
  return <CargaPortal>{children}</CargaPortal>;
}
