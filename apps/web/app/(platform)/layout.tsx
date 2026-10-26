import type { ReactNode } from "react";

import { PortalLayout } from "@/app/_components/portal-layout";

// Route group del portal "platform": el shell persiste en el layout (ADR-045); la página solo trae su contenido.
export default function Layout({ children }: { children: ReactNode }) {
  return <PortalLayout portal="platform">{children}</PortalLayout>;
}
