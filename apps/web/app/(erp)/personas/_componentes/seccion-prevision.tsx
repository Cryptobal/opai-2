import { PERMISOS_CORE } from "@opai/domain";
import { Alerta, Badge, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { BotonEditarSeccion, HojaEditarSeccion } from "./editar-seccion";
import { conDatos, SeccionError, SeccionSinAcceso, VacioSeccion } from "./estado-seccion";
import { previsionDe } from "./lecturas-ficha";
import { gruposPrevision, inicialPrevision, porVerificar } from "./vista-prevision";
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
  const vacia = !conDatos(d.afp, d.regimen, d.sistemaSalud, d.isapreNombre, d.planIsapre, d.tipoPension);
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
      {d.sensiblesOcultos ? (
        <div className="mb-3">
          <Alerta tono="warning" titulo="Datos sensibles ocultos">
            Tu rol no tiene permiso de lectura sensible. Pídelo a un administrador.
          </Alerta>
        </div>
      ) : null}
      {porVerificar(d) ? (
        <div className="mb-3">
          <Badge tono="neutro">Campo por verificar contra LRE / Previred</Badge>
        </div>
      ) : null}
      <div className="flex flex-col gap-4">
        {gruposPrevision(d).map((g) => (
          <div key={g.titulo}>
            <h4 className="t-overline mb-2 text-fg-muted">{g.titulo}</h4>
            <ParesGrid items={g.pares} />
          </div>
        ))}
      </div>
      {puede ? (
        <HojaEditarSeccion seccion="prevision" personaId={personaId} inicial={inicialPrevision(d)} />
      ) : null}
    </SeccionTarjeta>
  );
}
