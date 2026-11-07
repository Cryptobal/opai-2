import { PERMISOS_CORE } from "@opai/domain";
import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { BotonEditarSeccion, HojaEditarSeccion } from "./editar-seccion";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

type Laboral = {
  uniforme: {
    tallaCamisa: string | null;
    tallaPantalon: string | null;
    tallaChaqueta: string | null;
    tallaZapato: string | null;
    notas: string | null;
  } | null;
};

export async function SeccionUniforme({ personaId }: { personaId: string }) {
  const identidad = await identidadActual();
  if (!identidad || !puedeDeIdentidad(identidad)(PERMISOS_CORE.personasLaboralRead)) return null;
  const r = await ejecutarComoUsuario<Laboral>("erp", "core.personas.laboral_ver", { id: personaId });
  if (!r.ok) return null;
  const u = r.data.uniforme;
  const puede = puedeDeIdentidad(identidad)(PERMISOS_CORE.personasLaboralManage);
  return (
    <SeccionTarjeta
      titulo="Uniforme"
      {...(puede ? { accion: <BotonEditarSeccion seccion="uniforme" /> } : {})}
    >
      <ParesGrid
        items={[
          { etiqueta: "Camisa", valor: u?.tallaCamisa },
          { etiqueta: "Pantalón", valor: u?.tallaPantalon },
          { etiqueta: "Chaqueta", valor: u?.tallaChaqueta },
          { etiqueta: "Calzado", valor: u?.tallaZapato },
          { etiqueta: "Notas", valor: u?.notas },
        ]}
      />
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
