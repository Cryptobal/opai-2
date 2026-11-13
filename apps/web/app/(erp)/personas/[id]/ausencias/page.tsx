import { Plus } from "lucide-react";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { hoyIso } from "@/lib/fechas";
import type { SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { requerirIdentidad } from "@/lib/servidor";

import { FichaAusencias } from "../../_componentes/ausencias/ficha-ausencias";
import { HojaRegistrarDiferida } from "../../_componentes/ausencias/hoja-diferida";
import { conHoja } from "../../_componentes/lista-personas";
import { PaginaPersona } from "../../_componentes/pagina-persona";

export const metadata = { title: "Permisos y licencias" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/**
 * Persona · Ausencias (ADR-094, adenda CAR-311 d; CAR-393): permisos, licencias, vacaciones y ausencias de la
 * persona, leídos de su registro en el Núcleo (`core.ausencias.*`). No depende de la Pauta: si está activa, lo
 * registrado también marca los turnos de la persona. Ver pide el permiso laboral; registrar y anular, gestionarlo.
 */
export default function AusenciasPersona(props: Props) {
  return (
    <PaginaPersona {...props} tab="ausencias" acciones={<></>}>
      {async (p, q) => {
        const identidad = await requerirIdentidad(`/personas/${p.id}/ausencias`);
        const puede = puedeDeIdentidad(identidad);
        const conPauta = identidad.modulosActivos.includes("pauta");
        const puedeVer = puede("core:personas.laboral.read");
        const puedeEditar = puede("core:personas.laboral.manage");
        return (
          <div className="flex flex-col gap-4">
            {puedeEditar ? (
              <div className="flex justify-end">
                <EnlaceBotonHoja href={conHoja("registrar=1", q)} icono={Plus}>
                  Registrar permiso o licencia
                </EnlaceBotonHoja>
              </div>
            ) : null}
            {puedeVer ? (
              <FichaAusencias personaId={p.id} puedeEditar={puedeEditar} conPauta={conPauta} />
            ) : (
              <p className="t-caption">No tienes permiso para ver las ausencias de esta persona.</p>
            )}
            {puedeEditar ? (
              <HojaRegistrarDiferida
                personaId={p.id}
                nombre={p.nombreCompleto}
                hoy={hoyIso()}
                conPauta={conPauta}
              />
            ) : null}
          </div>
        );
      }}
    </PaginaPersona>
  );
}
