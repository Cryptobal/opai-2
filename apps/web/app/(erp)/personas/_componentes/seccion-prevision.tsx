import { PERMISOS_CORE } from "@opai/domain";
import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

type Prevision = {
  personaId: string;
  afp: string | null;
  regimen: string | null;
  sistemaSalud: string | null;
  isapreNombre: string | null;
  planIsapre: string | null;
  planUf: string | null;
  cotizacionUfPct: string | null;
};

export async function SeccionPrevision({ personaId }: { personaId: string }) {
  const identidad = await identidadActual();
  if (!identidad || !puedeDeIdentidad(identidad)(PERMISOS_CORE.personasPrevisionRead)) return null;
  const r = await ejecutarComoUsuario<Prevision>("erp", "core.personas.prevision_ver", {
    id: personaId,
  });
  if (!r.ok) return null;
  const d = r.data;
  return (
    <SeccionTarjeta titulo="Previsión">
      <ParesGrid
        items={[
          { etiqueta: "AFP", valor: d.afp },
          { etiqueta: "Régimen", valor: d.regimen },
          { etiqueta: "Salud", valor: d.sistemaSalud },
          { etiqueta: "ISAPRE", valor: d.isapreNombre },
          { etiqueta: "Plan ISAPRE", valor: d.planIsapre },
          { etiqueta: "Plan (UF)", valor: d.planUf },
          { etiqueta: "Cotización UF", valor: d.cotizacionUfPct },
        ]}
      />
    </SeccionTarjeta>
  );
}
