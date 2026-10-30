import { PERMISOS_CORE } from "@opai/domain";
import { Alerta, SeccionTarjeta } from "@opai/ds";

import { type AccionEntidad, AccionesEntidad } from "@/app/_components/maestros/acciones-entidad";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

type Marca = {
  personaId: string;
  activa: boolean;
  motivo: string | null;
  marcadaEn: string | null;
};

/**
 * P1 "No recontratar" (lista negra): solo RRHH y administradores. Sin el permiso, no se llama
 * siquiera a la capacidad: el resto no ve esta sección ni sabe que existe.
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
            descripcion: "Indica el motivo de levantar la marca; queda en Actividad.",
            boton: "Quitar marca",
            motivo: true,
          },
        },
      ]
    : [
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
            descripcion:
              "Queda visible solo para RRHH y administradores, con base de interés legítimo (Ley 21.719).",
            boton: "Marcar",
            peligro: true,
            motivo: true,
          },
        },
      ];

  return (
    <SeccionTarjeta titulo="No recontratar (P1)">
      {marca.activa ? (
        <Alerta tono="danger" titulo={`Marcada: ${marca.motivo ?? "sin motivo"}`} />
      ) : (
        <Alerta tono="neutral" titulo="Sin marca de «No recontratar»." />
      )}
      <div className="mt-3">
        <AccionesEntidad etiqueta="Acciones de la marca" acciones={acciones} />
      </div>
    </SeccionTarjeta>
  );
}
