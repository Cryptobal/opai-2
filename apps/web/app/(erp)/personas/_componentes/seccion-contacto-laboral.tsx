import { PERMISOS_CORE } from "@opai/domain";
import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { BotonEditarSeccion, HojaEditarSeccion } from "./editar-seccion";
import { telefono } from "@/lib/fechas";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

type Laboral = {
  contacto: {
    estadoCivil: string | null;
    telefonoSecundario: string | null;
    emergenciaNombre: string | null;
    emergenciaRelacion: string | null;
    emergenciaTelefono: string | null;
  } | null;
};

export async function SeccionContactoLaboral({ personaId }: { personaId: string }) {
  const identidad = await identidadActual();
  if (!identidad || !puedeDeIdentidad(identidad)(PERMISOS_CORE.personasLaboralRead)) return null;
  const r = await ejecutarComoUsuario<Laboral>("erp", "core.personas.laboral_ver", { id: personaId });
  if (!r.ok) return null;
  const c = r.data.contacto;
  const puede = puedeDeIdentidad(identidad)(PERMISOS_CORE.personasLaboralManage);
  return (
    <SeccionTarjeta
      titulo="Contacto laboral"
      {...(puede ? { accion: <BotonEditarSeccion seccion="contacto-laboral" /> } : {})}
    >
      <ParesGrid
        items={[
          { etiqueta: "Estado civil", valor: c?.estadoCivil },
          {
            etiqueta: "Teléfono secundario",
            valor: c?.telefonoSecundario ? telefono(c.telefonoSecundario) : null,
          },
          { etiqueta: "Emergencia", valor: c?.emergenciaNombre },
          { etiqueta: "Relación", valor: c?.emergenciaRelacion },
          {
            etiqueta: "Teléfono emergencia",
            valor: c?.emergenciaTelefono ? telefono(c.emergenciaTelefono) : null,
          },
        ]}
      />
      {puede ? (
        <HojaEditarSeccion
          seccion="contacto-laboral"
          personaId={personaId}
          inicial={{
            estadoCivil: c?.estadoCivil,
            telefonoSecundario: c?.telefonoSecundario,
            emergenciaNombre: c?.emergenciaNombre,
            emergenciaRelacion: c?.emergenciaRelacion,
            emergenciaTelefono: c?.emergenciaTelefono,
          }}
        />
      ) : null}
    </SeccionTarjeta>
  );
}

/** Fragmento corto para la pestaña Resumen. */
export async function ResumenContactoEmergencia({ personaId }: { personaId: string }) {
  const identidad = await identidadActual();
  if (!identidad || !puedeDeIdentidad(identidad)(PERMISOS_CORE.personasLaboralRead)) return null;
  const r = await ejecutarComoUsuario<Laboral>("erp", "core.personas.laboral_ver", { id: personaId });
  if (!r.ok || !r.data.contacto?.emergenciaNombre) return null;
  const c = r.data.contacto;
  return (
    <p className="t-caption mt-2">
      Emergencia: {c.emergenciaNombre}
      {c.emergenciaTelefono ? ` · ${telefono(c.emergenciaTelefono)}` : ""}
    </p>
  );
}
