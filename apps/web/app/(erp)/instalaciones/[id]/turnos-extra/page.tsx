import type { SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import { PaginaInstalacion } from "../../_componentes/pagina-instalacion";
import { TarifasTurnoExtra } from "../../_componentes/turnos-extra/tarifas";

export const metadata = { title: "Tarifas de turnos extra" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

export default async function Page(props: Props) {
  const { id } = await props.params;
  const identidad = await requerirIdentidad(`/instalaciones/${id}/turnos-extra`);
  const tarifas = await ejecutarComoUsuario<{
    instalacionClp: number | null;
    puestos: { puestoId: string; montoClp: number | null }[];
  }>("erp", "pauta.turnos_extra.tarifas_leer", { instalacionId: id });
  const puedeEditar = puedeDeIdentidad(identidad)("pauta:write");

  return (
    <PaginaInstalacion {...props} tab="turnos-extra">
      {(i) => (
        <TarifasTurnoExtra
          instalacionId={i.id}
          instalacion={i}
          tarifas={tarifas.ok ? tarifas.data : { instalacionClp: null, puestos: [] }}
          puedeEditar={puedeEditar}
        />
      )}
    </PaginaInstalacion>
  );
}