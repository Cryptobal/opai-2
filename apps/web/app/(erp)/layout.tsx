import type { ReactNode } from "react";

import { CargaPortal } from "@/app/_components/carga-portal";

// Route group del ERP (back-office). Su shell y navegación se completan con los módulos activos.
export default function Layout({ children }: { children: ReactNode }) {
  return <CargaPortal>{children}</CargaPortal>;
}
