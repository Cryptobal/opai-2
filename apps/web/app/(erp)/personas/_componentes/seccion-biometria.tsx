import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { consentido, type EstadoBiometria, type TextoConsentimientoVista } from "@/app/_components/biometria/tipos";
import { fechaHora } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { BotonesBiometria } from "./botones-biometria";

/**
 * Identificación facial de la persona (D-02, Res. Ex. 38 art. 57): el rostro con prueba de vida es el
 * mecanismo principal y RUT + PIN el secundario, siempre disponible. Aparece solo si el usuario puede
 * ver Asistencia; nunca muestra datos biométricos, solo el estado.
 */
export async function SeccionBiometria({ personaId, nombre }: { personaId: string; nombre: string }) {
  const [e, t] = await Promise.all([
    ejecutarComoUsuario<EstadoBiometria>("erp", "asistencia.biometria.estado", { personaId }),
    ejecutarComoUsuario<TextoConsentimientoVista[]>("erp", "asistencia.consentimientos.textos", {}),
  ]);
  if (!e.ok || !t.ok) return null;
  const s = e.data;
  const rostro = consentido(s, "biometria_facial");
  const telefono = consentido(s, "telefono_personal");
  return (
    <SeccionTarjeta
      titulo="Identificación facial y teléfono"
      accion={<BotonesBiometria personaId={personaId} nombre={nombre} estado={s} textos={t.data} />}
    >
      <ParesGrid
        items={[
          { etiqueta: "Rostro", valor: s.rostroEnrolado ? `Enrolado el ${fechaHora(s.enroladoEn ?? "")}` : "Sin enrolar" },
          { etiqueta: "Consentimiento del rostro", valor: rostro ? "Vigente" : "Falta" },
          { etiqueta: "Teléfono personal", valor: s.telefonoPersonalHabilitado ? "Habilitado" : "No habilitado" },
          { etiqueta: "Consentimiento del teléfono", valor: telefono ? "Vigente" : "Falta" },
        ]}
      />
      <p className="mt-3 text-base text-fg-muted">
        Sin rostro, o si el rostro falla, marca con su RUT y PIN. No se guarda ninguna foto: solo una referencia cifrada en el proveedor.
      </p>
    </SeccionTarjeta>
  );
}
