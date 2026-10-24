import type { ReactNode } from "react";

import { CargaPortal } from "@/app/_components/carga-portal";

// Route group del portal "platform". Cada portal tendrá su propio shell y navegación (Brief 01+).
export default function Layout({ children }: { children: ReactNode }) {
  return <CargaPortal>{children}</CargaPortal>;
}
