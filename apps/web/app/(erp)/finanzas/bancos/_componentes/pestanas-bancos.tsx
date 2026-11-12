import { Tabs } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

/** Secciones de Bancos como rutas reales (server-first, ADR-037): movimientos y reglas (CAR-328). */
export function PestanasBancos({ activa }: { activa: "movimientos" | "reglas" }) {
  return (
    <Tabs
      Link={LinkNext}
      activa={activa}
      tabs={[
        { id: "movimientos", etiqueta: "Movimientos", href: "/finanzas/bancos" },
        { id: "reglas", etiqueta: "Reglas", href: "/finanzas/bancos/reglas" },
      ]}
    />
  );
}
