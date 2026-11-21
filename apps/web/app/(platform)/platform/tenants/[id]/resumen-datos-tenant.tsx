import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { ETIQUETA_ROL } from "@/app/_components/portales";

import type { DetalleTenant } from "./tipos";

/** Datos generales de la empresa en el resumen. */
export function ResumenDatosTenant({ d }: { d: DetalleTenant }) {
  const owners = d.administradores.filter((a) => a.rol === "owner").map((a) => a.nombre);
  return (
    <SeccionTarjeta titulo="Datos">
      <ParesGrid
        items={[
          { etiqueta: "Zona horaria", valor: d.tenant.timezone },
          {
            etiqueta: owners.length > 1 ? "Propietarios" : "Propietario",
            valor: owners.join(", ") || null,
          },
          {
            etiqueta: "Administradores",
            valor:
              d.administradores
                .map((a) => `${a.nombre} (${ETIQUETA_ROL[a.rol] ?? a.rol})`)
                .join(", ") || null,
            ancho: true,
          },
        ]}
      />
    </SeccionTarjeta>
  );
}