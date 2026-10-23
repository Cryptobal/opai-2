import { notFound } from "next/navigation";

import { DsShell } from "./ds-shell";
import { DsShowcase } from "./showcase";

export const metadata = { title: "Diseño" };

/** Muestra del DS 2.0 (diseño aprobado): shell, cinco patrones y cuatro estados. Solo fuera de producción. */
export default function PaginaDs() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <DsShell>
      <DsShowcase />
    </DsShell>
  );
}
