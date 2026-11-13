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
 * Persona · Ausencias (ADR-094, adenda CAR-311 d, decisión de Carlos del 12-nov-2026): permisos, licencias,
 * vacaciones y ausencias de la persona. Se registran aquí y se ven en la pauta mensual y diaria. Requiere Pauta:
 * `pauta.ausencias.listar` filtra el alcance en la consulta (ADR-022) y registrar pide `pauta:write`.
 */
export default function AusenciasPersona(props: Props) {
  return (
    <PaginaPersona {...props} tab="ausencias" acciones={<></>}>
      {async (p, q) => {
        const identidad = await requerirIdentidad(`/personas/${p.id}/ausencias`);
        const pautaActiva = identidad.modulosActivos.includes("pauta");
        const puedeEditar = pautaActiva && puedeDeIdentidad(identidad)("pauta:write");
        return (
          <div className="flex flex-col gap-4">
            {puedeEditar ? (
              <div className="flex justify-end">
                <EnlaceBotonHoja href={conHoja("registrar=1", q)} icono={Plus}>
                  Registrar permiso o licencia
                </EnlaceBotonHoja>
              </div>
            ) : null}
            {pautaActiva ? (
              <FichaAusencias personaId={p.id} puedeEditar={puedeEditar} />
            ) : (
              <p className="t-caption">
                Los permisos y licencias se registran sobre la pauta: activa el módulo Pauta para
                usarlos.
              </p>
            )}
            {puedeEditar ? (
              <HojaRegistrarDiferida personaId={p.id} nombre={p.nombreCompleto} hoy={hoyIso()} />
            ) : null}
          </div>
        );
      }}
    </PaginaPersona>
  );
}
