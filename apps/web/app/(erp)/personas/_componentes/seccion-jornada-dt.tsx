import { PERMISOS_CORE } from "@opai/domain";
import { Alerta, Badge, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { BotonEditarSeccion, HojaEditarSeccion } from "./editar-seccion";
import { conDatos, SeccionError, SeccionSinAcceso, VacioSeccion } from "./estado-seccion";
import { estadoVencimiento } from "./estado-ficha";
import { laboralDe } from "./lecturas-ficha";
import { fecha, hoyIso } from "@/lib/fechas";
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
  const vacia = !conDatos(
    j?.resolucion,
    j?.horasSemanales,
    j?.distribucion,
    j?.terminoPlazoFijo,
    j?.articulo22,
  );
  // CAR-124 (export «Secciones» › Jornada DT): aviso cuando el plazo fijo vence pronto o ya venció.
  const plazo = estadoVencimiento(hoyIso(), j?.terminoPlazoFijo);
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
      {plazo && plazo.tono !== "success" && j?.terminoPlazoFijo ? (
        <div className="mb-3">
          <Alerta
            tono={plazo.tono === "danger" ? "danger" : "warning"}
            titulo={`Plazo fijo: ${plazo.etiqueta.toLowerCase()}`}
          >
            Término el {fecha(j.terminoPlazoFijo)}
            {j.plazoFijoPeriodo ? `, período ${j.plazoFijoPeriodo} de 3` : ""}. Decide si se
            renueva, pasa a indefinido o termina.
          </Alerta>
        </div>
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
            etiqueta: "Vigente desde",
            valor: j?.resolucionVigenteDesde ? fecha(j.resolucionVigenteDesde) : null,
          },
          {
            etiqueta: "Plazo fijo (período)",
            valor: j?.plazoFijoPeriodo ? `${j.plazoFijoPeriodo} de 3` : null,
          },
          {
            etiqueta: "Término plazo fijo",
            valor: j?.terminoPlazoFijo ? fecha(j.terminoPlazoFijo) : null,
          },
          {
            etiqueta: "Aviso de término",
            valor: j?.avisoTerminoDias != null ? `${j.avisoTerminoDias} días` : null,
          },
        ]}
      />
      {puede ? (
        <HojaEditarSeccion
          seccion="jornada-dt"
          personaId={personaId}
          inicial={{
            resolucion: j?.resolucion,
            resolucionVigenteDesde: j?.resolucionVigenteDesde,
            horasSemanales: j?.horasSemanales,
            distribucion: j?.distribucion,
            articulo22: j?.articulo22 ? "si" : "no",
            plazoFijoPeriodo: j?.plazoFijoPeriodo?.toString(),
            terminoPlazoFijo: j?.terminoPlazoFijo,
            avisoTerminoDias: j?.avisoTerminoDias?.toString(),
          }}
        />
      ) : null}
    </SeccionTarjeta>
  );
}
