import { PERMISOS_CORE } from "@opai/domain";
import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { fechaHora } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { BotonesPinTerreno } from "./botones-pin-terreno";

type EstadoPin = {
  tienePin: boolean;
  debeCambiar: boolean;
  bloqueadoHasta: string | null;
  asignadoEn: string | null;
  pinCambiadoEn: string | null;
  sinIngreso: "sin_usuario" | "portal_no_admitido" | null;
};

const SIN_INGRESO = {
  sin_usuario: "No tiene usuario en OPAI: invítala primero para que pueda ingresar.",
  portal_no_admitido:
    "Tiene acceso a otros portales: el PIN solo abre Trabajador y Terreno. Entra con su correo.",
} as const;

/** PIN de terreno (D-02): mecanismo secundario de ingreso, siempre disponible y sin biometría. */
export async function SeccionPinTerreno({
  personaId,
  nombre,
}: {
  personaId: string;
  nombre: string;
}) {
  const identidad = await identidadActual();
  if (!identidad || !puedeDeIdentidad(identidad)(PERMISOS_CORE.personasManage)) return null;
  const r = await ejecutarComoUsuario<EstadoPin>("erp", "core.credenciales_terreno.estado", {
    personaId,
  });
  if (!r.ok) return null;
  const e = r.data;
  const estado = e.bloqueadoHasta
    ? `Pausado hasta las ${fechaHora(e.bloqueadoHasta)}`
    : !e.tienePin
      ? "Sin PIN"
      : e.debeCambiar
        ? "Asignado; lo cambia en su primer ingreso"
        : "Activo";
  return (
    <SeccionTarjeta
      titulo="PIN de terreno"
      accion={<BotonesPinTerreno personaId={personaId} nombre={nombre} tienePin={e.tienePin} />}
    >
      <ParesGrid
        items={[
          { etiqueta: "Estado", valor: estado },
          { etiqueta: "Asignado", valor: e.asignadoEn ? fechaHora(e.asignadoEn) : null },
          { etiqueta: "Último cambio", valor: e.pinCambiadoEn ? fechaHora(e.pinCambiadoEn) : null },
        ]}
      />
      {e.sinIngreso ? (
        <p className="mt-3 text-base text-fg-muted">{SIN_INGRESO[e.sinIngreso]}</p>
      ) : null}
    </SeccionTarjeta>
  );
}
