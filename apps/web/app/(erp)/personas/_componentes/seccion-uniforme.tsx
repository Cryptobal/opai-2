import { PERMISOS_CORE } from "@opai/domain";
import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { BotonEditarSeccion, HojaEditarSeccion } from "./editar-seccion";
import { conDatos, SeccionError, SeccionSinAcceso, VacioSeccion } from "./estado-seccion";
import { laboralDe } from "./lecturas-ficha";
import { fecha } from "@/lib/fechas";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { identidadActual } from "@/lib/servidor";

const TITULO = "Uniforme y tallas";

export async function SeccionUniforme({ personaId }: { personaId: string }) {
  const identidad = await identidadActual();
  if (!identidad) return null;
  if (!puedeDeIdentidad(identidad)(PERMISOS_CORE.personasLaboralRead))
    return <SeccionSinAcceso titulo={TITULO} />;
  const r = await laboralDe(personaId);
  if (!r.ok) return <SeccionError titulo={TITULO} que="el uniforme" />;
  const u = r.data.uniforme;
  const puede = puedeDeIdentidad(identidad)(PERMISOS_CORE.personasLaboralManage);
  const vacio = !conDatos(
    u?.tallaCamisa,
    u?.tallaPantalon,
    u?.tallaChaqueta,
    u?.tallaZapato,
    u?.notas,
  );
  // CAR-124: las entregas ya estaban en la capacidad y no se mostraban (export «Secciones», tarjeta «Entregadas»).
  const entregas = u?.entregas ?? [];
  return (
    <SeccionTarjeta
      titulo={TITULO}
      {...(puede
        ? {
            accion: (
              <BotonEditarSeccion seccion="uniforme" {...(vacio ? { etiqueta: "Agregar" } : {})} />
            ),
          }
        : {})}
    >
      {vacio ? (
        <VacioSeccion texto="Sin tallas registradas." accion={puede ? "Agregar" : null} />
      ) : null}
      <ParesGrid
        items={[
          { etiqueta: "Camisa", valor: u?.tallaCamisa },
          { etiqueta: "Pantalón", valor: u?.tallaPantalon },
          { etiqueta: "Chaqueta", valor: u?.tallaChaqueta },
          { etiqueta: "Calzado", valor: u?.tallaZapato },
          { etiqueta: "Notas", valor: u?.notas, ancho: true },
        ]}
      />
      <h4 className="t-label mt-4 mb-2">Entregadas</h4>
      {entregas.length ? (
        <ParesGrid
          unaColumna
          items={entregas.map((e) => ({
            etiqueta: fecha(e.entregadaEn),
            valor: `${e.articulo}${e.talla ? ` · talla ${e.talla}` : ""}${e.cantidad > 1 ? ` · ${e.cantidad} unidades` : ""}`,
          }))}
        />
      ) : (
        <p className="t-caption">Sin entregas registradas.</p>
      )}
      {puede ? (
        <HojaEditarSeccion
          seccion="uniforme"
          personaId={personaId}
          inicial={{
            tallaCamisa: u?.tallaCamisa,
            tallaPantalon: u?.tallaPantalon,
            tallaChaqueta: u?.tallaChaqueta,
            tallaZapato: u?.tallaZapato,
            notas: u?.notas,
          }}
        />
      ) : null}
    </SeccionTarjeta>
  );
}
