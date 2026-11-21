import { PERMISOS_CORE } from "@opai/domain";
import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { BotonesPinTerreno } from "./botones-pin-terreno";
import { type AccesoPersona } from "./acceso-portal-persona";
import { TarjetaAccesoPortal } from "./tarjeta-acceso-portal";

type Props = {
  personaId: string;
  nombre: string;
  tieneUsuario: boolean;
  personaActiva: boolean;
};

/** Acceso al portal del trabajador y PIN en el resumen de la persona (CAR-803). */
export async function SeccionAccesoPortal(p: Props) {
  const identidad = await identidadActual();
  if (!identidad) return null;
  const puedePersonas = puedeDeIdentidad(identidad)(PERMISOS_CORE.personasManage);
  const puedeUsuarios = puedeDeIdentidad(identidad)(PERMISOS_CORE.usersManage);
  const puedeGestionar = puedePersonas && puedeUsuarios;

  const acceso = puedePersonas
    ? await ejecutarComoUsuario<AccesoPersona>("erp", "core.personas.acceso_estado", {
        personaId: p.personaId,
      })
    : null;

  const pin =
    puedePersonas
      ? await ejecutarComoUsuario<{ tienePin: boolean }>("erp", "core.credenciales_terreno.estado", {
          personaId: p.personaId,
        })
      : null;

  if (!puedePersonas || !acceso?.ok) return null;
  const e = acceso.data;

  return (
    <SeccionTarjeta
      titulo="Acceso"
      accion={
        pin?.ok ? (
          <BotonesPinTerreno personaId={p.personaId} nombre={p.nombre} tienePin={pin.data.tienePin} />
        ) : null
      }
    >
      <TarjetaAccesoPortal
        personaId={p.personaId}
        acceso={e}
        puedeGestionar={puedeGestionar}
        tieneUsuario={p.tieneUsuario}
        personaActiva={p.personaActiva}
      />
      <div className="mt-4 border-t border-border pt-4">
        <ParesGrid
          items={[
            { etiqueta: "Usuario vinculado", valor: p.tieneUsuario ? "Sí" : "No" },
            {
              etiqueta: "PIN de terreno",
              valor: pin?.ok ? (pin.data.tienePin ? "Creado" : "Sin PIN") : null,
            },
          ]}
        />
      </div>
    </SeccionTarjeta>
  );
}