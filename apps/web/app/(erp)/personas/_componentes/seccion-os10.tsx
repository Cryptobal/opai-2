import { PERMISOS_CORE } from "@opai/domain";
import { Badge, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { BotonEditarSeccion, HojaEditarSeccion } from "./editar-seccion";
import { conDatos, SeccionError, SeccionSinAcceso, VacioSeccion } from "./estado-seccion";
import { estadoOs10 } from "./estado-ficha";
import { laboralDe } from "./lecturas-ficha";
import { fecha, hoyIso } from "@/lib/fechas";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { identidadActual } from "@/lib/servidor";

const TITULO = "OS-10";

export async function SeccionOs10({ personaId }: { personaId: string }) {
  const identidad = await identidadActual();
  if (!identidad) return null;
  if (!puedeDeIdentidad(identidad)(PERMISOS_CORE.personasLaboralRead))
    return <SeccionSinAcceso titulo={TITULO} />;
  const r = await laboralDe(personaId);
  if (!r.ok) return <SeccionError titulo={TITULO} que="el OS-10" />;
  const o = r.data.os10;
  const puede = puedeDeIdentidad(identidad)(PERMISOS_CORE.personasLaboralManage);
  const vacio = !conDatos(o?.credencial, o?.venceEn);
  // CAR-124 (export «Secciones» › OS-10): insignia de vigencia (vigente, vence en N días, vencido).
  const estado = estadoOs10(hoyIso(), o);
  return (
    <SeccionTarjeta
      titulo={TITULO}
      accion={
        <>
          {vacio ? null : <Badge tono={estado.tono}>{estado.etiqueta}</Badge>}
          {puede ? (
            <BotonEditarSeccion
              seccion="os10"
              etiqueta={vacio ? "Agregar" : estado.tono === "success" ? "Editar" : "Renovar"}
            />
          ) : null}
        </>
      }
    >
      {vacio ? (
        <VacioSeccion texto="Sin credencial OS-10 registrada." accion={puede ? "Agregar" : null} />
      ) : null}
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
