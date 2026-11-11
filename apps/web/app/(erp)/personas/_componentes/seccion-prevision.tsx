import { PERMISOS_CORE } from "@opai/domain";
import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { BotonEditarSeccion, HojaEditarSeccion } from "./editar-seccion";
import { conDatos, SeccionError, SeccionSinAcceso, VacioSeccion } from "./estado-seccion";
import { previsionDe } from "./lecturas-ficha";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { identidadActual } from "@/lib/servidor";

const TITULO = "Previsión";

export async function SeccionPrevision({ personaId }: { personaId: string }) {
  const identidad = await identidadActual();
  if (!identidad) return null;
  if (!puedeDeIdentidad(identidad)(PERMISOS_CORE.personasPrevisionRead))
    return <SeccionSinAcceso titulo={TITULO} />;
  const r = await previsionDe(personaId);
  if (!r.ok) return <SeccionError titulo={TITULO} que="la previsión" />;
  const d = r.data;
  const puede = puedeDeIdentidad(identidad)(PERMISOS_CORE.personasPrevisionManage);
  const vacia = !conDatos(d.afp, d.regimen, d.sistemaSalud, d.isapreNombre, d.planIsapre);
  return (
    <SeccionTarjeta
      titulo={TITULO}
      {...(puede
        ? {
            accion: (
              <BotonEditarSeccion seccion="prevision" {...(vacia ? { etiqueta: "Agregar" } : {})} />
            ),
          }
        : {})}
    >
      {vacia ? (
        <VacioSeccion texto="Sin previsión registrada." accion={puede ? "Agregar" : null} />
      ) : null}
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
      {puede ? (
        <HojaEditarSeccion
          seccion="prevision"
          personaId={personaId}
          inicial={{
            afp: d.afp,
            regimen: d.regimen,
            sistemaSalud: d.sistemaSalud,
            isapreNombre: d.isapreNombre,
            planIsapre: d.planIsapre,
            planUf: d.planUf,
            cotizacionUfPct: d.cotizacionUfPct,
          }}
        />
      ) : null}
    </SeccionTarjeta>
  );
}
