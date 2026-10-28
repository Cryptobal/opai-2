import { FilePlus } from "lucide-react";

import { SeccionTarjeta } from "@opai/ds";
import { PERMISOS_CORE } from "@opai/domain";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { identidadActual } from "@/lib/servidor";

import { ConsentimientosTitular } from "./consentimientos-titular";
import { HojaConsentimiento, HojaSolicitud } from "./diferidas";

type Props = { titular: { tipo: "persona" | "contacto"; id: string; nombre: string } };

/**
 * Privacidad del titular dentro de su ficha (ADR-041: pestaña, no pantalla suelta): consentimientos
 * y registrar una solicitud ARCO+ con el titular ya identificado. Solo con `cumplimiento.read`.
 */
export async function PrivacidadTitular({ titular }: Props) {
  const identidad = await identidadActual();
  const puede = identidad ? puedeDeIdentidad(identidad) : () => false;
  if (!puede(PERMISOS_CORE.cumplimientoRead)) return null;
  const gestionar = puede(PERMISOS_CORE.cumplimientoManage);
  const ref = { tipo: titular.tipo, id: titular.id };
  return (
    <div className="flex flex-col gap-4">
      <ConsentimientosTitular titular={ref} gestionar={gestionar} />
      <SeccionTarjeta
        titulo="Solicitudes del titular"
        {...(gestionar
          ? {
              accion: (
                <EnlaceBotonHoja href="?solicitud=1" icono={FilePlus} variante="secondary">
                  Registrar solicitud
                </EnlaceBotonHoja>
              ),
            }
          : {})}
      >
        <div className="flex flex-col items-start gap-3">
          <p className="text-base text-fg-muted">
            Acceso, rectificación, cancelación, oposición, portabilidad o bloqueo (Ley 21.719). Se
            atienden en la bandeja de Datos personales, con su plazo y evidencia.
          </p>
          <EnlaceBoton href="/configuracion/cumplimiento/solicitudes" variante="ghost">
            Ir a la bandeja
          </EnlaceBoton>
        </div>
      </SeccionTarjeta>
      {gestionar ? (
        <>
          <HojaConsentimiento titular={ref} />
          <HojaSolicitud titular={titular} />
        </>
      ) : null}
    </div>
  );
}
