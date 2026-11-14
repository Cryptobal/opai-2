import { PERMISOS_CORE } from "@opai/domain";
import { Alerta, Badge, Enlace, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { BotonEditarSeccion, HojaEditarSeccion } from "./editar-seccion";
import { SeccionError, SeccionSinAcceso, VacioSeccion } from "./estado-seccion";
import { estadoOs10 } from "./estado-ficha";
import { laboralDe } from "./lecturas-ficha";
import { os10Efectivo } from "./os10-efectivo";
import { LinkNext } from "@/app/_components/link-next";
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
  // CAR-429: el vencimiento sale del documento vigente en Documentos; el dato manual solo sin él.
  const e = os10Efectivo(o, r.data.os10Respaldo);
  const puede = puedeDeIdentidad(identidad)(PERMISOS_CORE.personasLaboralManage);
  const vacio = e.fuente === null;
  // CAR-124 (export «Secciones» › OS-10): insignia de vigencia (vigente, vence en N días, vencido).
  const estado = estadoOs10(hoyIso(), e);
  return (
    <SeccionTarjeta
      titulo={TITULO}
      accion={
        <>
          {vacio ? null : <Badge tono={estado.tono}>{estado.etiqueta}</Badge>}
          {e.fuente === "manual" ? <Badge tono="neutro">Sin respaldo</Badge> : null}
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
      {e.difiere && o?.venceEn ? (
        <Alerta
          tono="warning"
          titulo="La fecha de la ficha no coincide con el documento"
          className="mb-3"
        >
          La ficha dice {fecha(o.venceEn)}; vale la del documento vigente.
        </Alerta>
      ) : null}
      <ParesGrid
        items={[
          { etiqueta: "Credencial", valor: e.credencial, mono: true },
          { etiqueta: "Vence", valor: e.venceEn ? fecha(e.venceEn) : null },
          {
            etiqueta: "Respaldo",
            valor:
              e.fuente === "documento" ? (
                <Enlace Link={LinkNext} href={`/personas/${personaId}/documentos`}>
                  Credencial en Documentos
                </Enlace>
              ) : e.fuente === "manual" ? (
                "Sin documento: dato ingresado a mano"
              ) : null,
          },
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
