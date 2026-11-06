import { PERMISOS_CORE } from "@opai/domain";
import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { BotonEditarSeccion, HojaEditarSeccion } from "./editar-seccion";
import { fecha } from "@/lib/fechas";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

type Laboral = {
  os10: { credencial: string | null; venceEn: string | null } | null;
};

export async function SeccionOs10({ personaId }: { personaId: string }) {
  const identidad = await identidadActual();
  if (!identidad || !puedeDeIdentidad(identidad)(PERMISOS_CORE.personasLaboralRead)) return null;
  const r = await ejecutarComoUsuario<Laboral>("erp", "core.personas.laboral_ver", { id: personaId });
  if (!r.ok) return null;
  const o = r.data.os10;
  const puede = puedeDeIdentidad(identidad)(PERMISOS_CORE.personasLaboralManage);
  return (
    <SeccionTarjeta
      titulo="OS-10"
      {...(puede ? { accion: <BotonEditarSeccion seccion="os10" /> } : {})}
    >
      <ParesGrid
        items={[
          { etiqueta: "Credencial", valor: o?.credencial, mono: true },
          { etiqueta: "Vence", valor: o?.venceEn ? fecha(o.venceEn) : null },
        ]}
      />
      {puede ? (
        <HojaEditarSeccion
          seccion="os10"
          personaId={personaId}
          inicial={{ credencial: o?.credencial, venceEn: o?.venceEn }}
        />
      ) : null}
    </SeccionTarjeta>
  );
}
