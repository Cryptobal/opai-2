import { PERMISOS_CORE } from "@opai/domain";
import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { Ruler } from "lucide-react";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";

import { HojaTallas } from "./diferidas-laboral";
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
  const tallas = r.data.tallas;
  const puede = puedeDeIdentidad(identidad)(PERMISOS_CORE.personasLaboralManage);
  const vacio = !conDatos(...tallas.map((t) => t.talla), u?.estaturaCm, u?.pesoKg, u?.notas);
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
          // CAR-408: una fila por prenda del uniforme de la empresa (las de su rubro si no definió las suyas).
          ...tallas.map((t) => ({
            etiqueta: t.enKit ? t.nombre : `${t.nombre} (ya no se usa)`,
            valor: t.talla,
          })),
          { etiqueta: "Estatura", valor: u?.estaturaCm ? `${u.estaturaCm} cm` : null },
          { etiqueta: "Peso", valor: u?.pesoKg ? `${u.pesoKg} kg` : null },
          { etiqueta: "Notas", valor: u?.notas, ancho: true },
        ]}
      />
      {puede ? (
        <div className="mt-3">
          <EnlaceBotonHoja variante="secondary" icono={Ruler} href="?editar-tallas=1">
            Editar tallas
          </EnlaceBotonHoja>
          <HojaTallas personaId={personaId} tallas={tallas} />
        </div>
      ) : null}
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
            estaturaCm: u?.estaturaCm?.toString(),
            pesoKg: u?.pesoKg?.toString(),
            notas: u?.notas,
          }}
        />
      ) : null}
    </SeccionTarjeta>
  );
}
