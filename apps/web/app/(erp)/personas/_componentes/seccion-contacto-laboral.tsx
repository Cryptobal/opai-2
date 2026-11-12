import { PERMISOS_CORE } from "@opai/domain";
import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { BotonEditarSeccion, HojaEditarSeccion } from "./editar-seccion";
import { telefono } from "@/lib/fechas";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { identidadActual } from "@/lib/servidor";

import { conDatos, SeccionError, SeccionSinAcceso, VacioSeccion } from "./estado-seccion";
import { laboralDe } from "./lecturas-ficha";

const TITULO = "Contacto y datos personales";

export async function SeccionContactoLaboral({ personaId }: { personaId: string }) {
  const identidad = await identidadActual();
  if (!identidad) return null;
  if (!puedeDeIdentidad(identidad)(PERMISOS_CORE.personasLaboralRead))
    return <SeccionSinAcceso titulo={TITULO} />;
  const r = await laboralDe(personaId);
  if (!r.ok) return <SeccionError titulo={TITULO} que="el contacto" />;
  const c = r.data.contacto;
  const puede = puedeDeIdentidad(identidad)(PERMISOS_CORE.personasLaboralManage);
  const vacio = !conDatos(
    c?.estadoCivil,
    c?.telefonoSecundario,
    c?.emergenciaNombre,
    c?.emergenciaTelefono,
  );
  return (
    <SeccionTarjeta
      titulo={TITULO}
      {...(puede
        ? {
            accion: (
              <BotonEditarSeccion
                seccion="contacto-laboral"
                {...(vacio ? { etiqueta: "Agregar" } : {})}
              />
            ),
          }
        : {})}
    >
      {vacio ? (
        <VacioSeccion
          texto="Sin contacto de emergencia ni datos personales."
          accion={puede ? "Agregar" : null}
        />
      ) : null}
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
  const r = await laboralDe(personaId);
  if (!r.ok || !r.data.contacto?.emergenciaNombre) return null;
  const c = r.data.contacto;
  return (
    <p className="t-caption mt-2">
      Emergencia: {c.emergenciaNombre}
      {c.emergenciaTelefono ? ` · ${telefono(c.emergenciaTelefono)}` : ""}
    </p>
  );
}
