import { PERMISOS_CORE } from "@opai/domain";

import type { SearchParams } from "@/lib/parametros";
import { contextoServidor, identidadActual } from "@/lib/servidor";

import { DetalleAnexo } from "@/app/_components/anexos/detalle-anexo";
import { PaginaPersona } from "../../../_componentes/pagina-persona";

export const metadata = { title: "Anexo de contrato" };

type Props = {
  params: Promise<{ id: string; anexoId: string }>;
  searchParams: SearchParams;
};

/** Anexo en borrador (26-29, R13-R15): documento con la plantilla base y la marca del tenant, y el
 * panel de aprobación. Aprobar lo materializa en Documentos; rechazar pide motivo (D14). */
export default function AnexoPersona({ params, searchParams }: Props) {
  const propsPersona = {
    params: params.then(({ id }) => ({ id })),
    searchParams,
  };
  return (
    <PaginaPersona {...propsPersona} tab="anexos" acciones={<></>}>
      {async (p) => {
        const [{ anexoId }, identidad] = await Promise.all([params, identidadActual()]);
        const puedeResolver = Boolean(
          identidad && contextoServidor(identidad, "erp").autorizar(PERMISOS_CORE.anexosManage),
        );
        return <DetalleAnexo personaId={p.id} anexoId={anexoId} puedeResolver={puedeResolver} />;
      }}
    </PaginaPersona>
  );
}
