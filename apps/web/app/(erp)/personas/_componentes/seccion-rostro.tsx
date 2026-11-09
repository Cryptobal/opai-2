import { PERMISOS_CORE } from "@opai/domain";
import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { fechaHora } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { BotonBorrarRostro } from "./boton-borrar-rostro";
import { BotonTelefono } from "./boton-telefono";

type Estado = { enrolada: boolean; proveedor: string | null; enroladoEn: string | null; consentimiento: "otorgado" | "revocado" | "sin_registro" };
const CONSENTIMIENTO = { otorgado: "Vigente", revocado: "Revocado", sin_registro: "Sin registro" } as const;

/**
 * Rostro de la persona (D-02, Res. Ex. 38 art. 57): solo el estado, nunca datos biométricos. El enrolamiento lo hace
 * la propia persona en su teléfono o en el kiosco (con su consentimiento, registrado en Cumplimiento); RR. HH. puede
 * borrarlo. Sin rostro, o si falla, marca con RUT y PIN.
 */
export async function SeccionRostro({ personaId, nombre }: { personaId: string; nombre: string }) {
  const identidad = await identidadActual();
  if (!identidad || !puedeDeIdentidad(identidad)(PERMISOS_CORE.personasManage)) return null;
  const [r, pin] = await Promise.all([
    ejecutarComoUsuario<Estado>("erp", "core.biometria.estado", { personaId }),
    ejecutarComoUsuario<{ tienePin: boolean; telefonoPersonalHabilitado: boolean }>("erp", "core.credenciales_terreno.estado", { personaId }),
  ]);
  if (!r.ok) return null;
  const e = r.data;
  const telefono = pin.ok ? pin.data : null;
  return (
    <SeccionTarjeta titulo="Rostro para marcar" accion={
        <div className="flex flex-wrap gap-2">
          {telefono?.tienePin ? <BotonTelefono personaId={personaId} habilitado={telefono.telefonoPersonalHabilitado} /> : null}
          {e.enrolada ? <BotonBorrarRostro personaId={personaId} nombre={nombre} /> : null}
        </div>
      }>
      <ParesGrid
        items={[
          { etiqueta: "Rostro", valor: e.enrolada ? `Enrolado el ${fechaHora(e.enroladoEn ?? "")}` : "Sin enrolar" },
          { etiqueta: "Consentimiento", valor: CONSENTIMIENTO[e.consentimiento] },
          { etiqueta: "Teléfono personal", valor: telefono?.telefonoPersonalHabilitado ? "Habilitado" : "No habilitado" },
        ]}
      />
      <p className="mt-3 text-base text-fg-muted">No se guarda ninguna foto: solo una referencia cifrada en el proveedor. Sin rostro, marca con su RUT y PIN.</p>
    </SeccionTarjeta>
  );
}
