import { PERMISOS_CORE } from "@opai/domain";
import { Badge, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { BloqueContratoPeriodos } from "./bloque-contrato-periodos";
import { BotonEditarSeccion, HojaEditarSeccion } from "./editar-seccion";
import { conDatos, SeccionError, SeccionSinAcceso, VacioSeccion } from "./estado-seccion";
import { laboralDe } from "./lecturas-ficha";
import { fecha } from "@/lib/fechas";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { identidadActual } from "@/lib/servidor";

const TITULO = "Jornada DT y contrato";

export async function SeccionJornadaDt({ personaId }: { personaId: string }) {
  const identidad = await identidadActual();
  if (!identidad) return null;
  if (!puedeDeIdentidad(identidad)(PERMISOS_CORE.personasLaboralRead))
    return <SeccionSinAcceso titulo={TITULO} />;
  const r = await laboralDe(personaId);
  if (!r.ok) return <SeccionError titulo={TITULO} que="la jornada DT" />;
  const j = r.data.jornadaDt;
  const puede = puedeDeIdentidad(identidad)(PERMISOS_CORE.personasLaboralManage);
  const vacia = !conDatos(j?.resolucion, j?.horasSemanales, j?.distribucion, j?.articulo22);
  return (
    <SeccionTarjeta
      titulo={TITULO}
      {...(puede
        ? {
            accion: (
              <BotonEditarSeccion
                seccion="jornada-dt"
                {...(vacia ? { etiqueta: "Agregar" } : {})}
              />
            ),
          }
        : {})}
    >
      {vacia ? (
        <VacioSeccion texto="Sin jornada registrada." accion={puede ? "Agregar" : null} />
      ) : null}
      <ParesGrid
        items={[
          {
            etiqueta: "Jornada",
            valor: j?.horasSemanales
              ? `${j.horasSemanales} h semanales${j.distribucion ? ` · ${j.distribucion}` : ""}`
              : j?.distribucion,
          },
          {
            etiqueta: "Artículo 22",
            valor: j?.articulo22 ? <Badge tono="info">Excluido de límite de jornada</Badge> : "No",
          },
          { etiqueta: "Resolución", valor: j?.resolucion },
          {
            etiqueta: "Vigente",
            valor: j?.resolucionVigenteDesde
              ? `desde ${fecha(j.resolucionVigenteDesde)}${j.resolucionVigenteHasta ? ` hasta ${fecha(j.resolucionVigenteHasta)}` : ""}`
              : j?.resolucionVigenteHasta
                ? `hasta ${fecha(j.resolucionVigenteHasta)}`
                : null,
          },
          {
            etiqueta: "Aviso de término",
            valor: j?.avisoTerminoDias != null ? `${j.avisoTerminoDias} días` : null,
          },
        ]}
      />
      <BloqueContratoPeriodos personaId={personaId} contrato={r.data.contrato} puede={puede} />
      {puede ? (
        <HojaEditarSeccion
          seccion="jornada-dt"
          personaId={personaId}
          inicial={{
            resolucion: j?.resolucion,
            resolucionVigenteDesde: j?.resolucionVigenteDesde,
            resolucionVigenteHasta: j?.resolucionVigenteHasta,
            horasSemanales: j?.horasSemanales,
            distribucion: j?.distribucion,
            articulo22: j?.articulo22 ? "si" : "no",
            avisoTerminoDias: j?.avisoTerminoDias?.toString(),
          }}
        />
      ) : null}
    </SeccionTarjeta>
  );
}
