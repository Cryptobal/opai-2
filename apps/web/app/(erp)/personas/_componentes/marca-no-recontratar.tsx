import { noRecontratarHabilitadaAhora } from "@opai/capabilities";
import { PERMISOS_CORE } from "@opai/domain";
import { Alerta, SeccionTarjeta } from "@opai/ds";

import { type AccionEntidad, AccionesEntidad } from "@/app/_components/maestros/acciones-entidad";
import { fecha } from "@/lib/fechas";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

type Marca = {
  personaId: string;
  activa: boolean;
  motivo: string | null;
  marcadaEn: string | null;
  venceEn: string | null;
};

const DESCRIPCION_MARCAR =
  "Solo RRHH y administradores verán esta marca. Base legal: interés legítimo del empleador " +
  "(art. 13 d) de la Ley 19.628, modificada por la Ley 21.719, vigente desde el 01-12-2026). " +
  "Describe un hecho laboral objetivo y documentado de la relación anterior. No escribas datos de " +
  "salud, embarazo, sindicación, deudas, origen, creencias ni ningún motivo del art. 2° del Código " +
  "del Trabajo, ni imputes delitos. La marca no impide por sí sola una contratación: es un " +
  "antecedente que revisa una persona.";

/**
 * P1 "No recontratar": solo RRHH y administradores. Sin el permiso, no se llama siquiera a la
 * capacidad: el resto no ve esta sección ni sabe que existe. Antes del 01-12-2026 (art. 13 d) de la
 * Ley 19.628, modificada por la 21.719) tampoco se puede marcar: la acción no se muestra.
 */
export async function MarcaNoRecontratar({
  personaId,
  nombre,
}: {
  personaId: string;
  nombre: string;
}) {
  const identidad = await identidadActual();
  if (!identidad) return null;
  if (!puedeDeIdentidad(identidad)(PERMISOS_CORE.personasNoRecontratarManage)) return null;

  const r = await ejecutarComoUsuario<Marca>("erp", "core.personas.no_recontratar_ver", {
    id: personaId,
  });
  if (!r.ok) return null;
  const marca = r.data;

  const acciones: AccionEntidad[] = marca.activa
    ? [
        {
          id: "quitar_no_recontratar",
          etiqueta: "Quitar marca",
          capacidad: {
            id: "core.personas.quitar_no_recontratar",
            input: { id: personaId },
            exito: "Marca retirada",
          },
          confirmar: {
            titulo: `Quitar «No recontratar» a ${nombre}`,
            descripcion:
              "Indica por qué se levanta la marca. Al quitarla, el motivo anterior se elimina; en " +
              "Actividad queda solo que la marca existió y se quitó.",
            boton: "Quitar marca",
            motivo: true,
          },
        },
      ]
    : noRecontratarHabilitadaAhora()
      ? [
          {
            id: "marcar_no_recontratar",
            etiqueta: "Marcar «No recontratar»",
            peligro: true,
            capacidad: {
              id: "core.personas.marcar_no_recontratar",
              input: { id: personaId },
              exito: "Persona marcada",
            },
            confirmar: {
              titulo: `Marcar a ${nombre} como «No recontratar»`,
              descripcion: `${DESCRIPCION_MARCAR} ${nombre} puede pedir ver esta marca y su motivo, y oponerse.`,
              boton: "Marcar",
              peligro: true,
              motivo: true,
              motivoEtiqueta: "Hecho que la justifica (con respaldo)",
              motivoPlaceholder: "Ej.: abandono de turno el 15-03-2027, acta N° 123",
              fecha: {
                etiqueta: "Vence el",
                ayuda: "Se eliminará automáticamente la marca y el motivo en esta fecha.",
                clave: "venceEn",
              },
            },
          },
        ]
      : [];

  return (
    <SeccionTarjeta titulo="No recontratar (P1)">
      {marca.activa ? (
        <Alerta
          tono="danger"
          titulo={`No recontratar · desde ${fecha(marca.marcadaEn)} · se elimina el ${fecha(marca.venceEn)}`}
        />
      ) : (
        <Alerta tono="neutral" titulo="Sin marca de «No recontratar»." />
      )}
      <div className="mt-3">
        <AccionesEntidad etiqueta="Acciones de la marca" acciones={acciones} />
      </div>
    </SeccionTarjeta>
  );
}
