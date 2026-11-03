import { PERMISOS_CORE } from "@opai/domain";
import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

type Laboral = {
  jornadaDt: {
    resolucion: string | null;
    resolucionVigenteDesde: string | null;
    horasSemanales: string | null;
    distribucion: string | null;
    articulo22: boolean;
    plazoFijoPeriodo: number | null;
    terminoPlazoFijo: string | null;
    avisoTerminoDias: number | null;
  } | null;
};

export async function SeccionJornadaDt({ personaId }: { personaId: string }) {
  const identidad = await identidadActual();
  if (!identidad || !puedeDeIdentidad(identidad)(PERMISOS_CORE.personasLaboralRead)) return null;
  const r = await ejecutarComoUsuario<Laboral>("erp", "core.personas.laboral_ver", { id: personaId });
  if (!r.ok) return null;
  const j = r.data.jornadaDt;
  return (
    <SeccionTarjeta titulo="Jornada DT">
      <ParesGrid
        items={[
          { etiqueta: "Resolución", valor: j?.resolucion },
          { etiqueta: "Vigente desde", valor: j?.resolucionVigenteDesde },
          { etiqueta: "Horas semanales", valor: j?.horasSemanales },
          { etiqueta: "Distribución", valor: j?.distribucion },
          { etiqueta: "Artículo 22", valor: j?.articulo22 ? "Sí" : "No" },
          { etiqueta: "Plazo fijo (período)", valor: j?.plazoFijoPeriodo?.toString() ?? null },
          { etiqueta: "Término plazo fijo", valor: j?.terminoPlazoFijo },
          { etiqueta: "Aviso término (días)", valor: j?.avisoTerminoDias?.toString() ?? null },
        ]}
      />
    </SeccionTarjeta>
  );
}
