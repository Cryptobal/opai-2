import type { SearchParams } from "@/lib/parametros";

import { NegociosDeEntidad } from "../../../negocios/_componentes/negocios-de-entidad";
import { PaginaInstalacion } from "../../_componentes/pagina-instalacion";

export const metadata = { title: "Negocios de la instalación" };
type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Tab Negocios de una instalación: las oportunidades que la incluyen (ADR-041). */
export default function NegociosInstalacion(props: Props) {
  return (
    <PaginaInstalacion {...props} tab="negocios">
      {(i) => <NegociosDeEntidad instalacionId={i.id} />}
    </PaginaInstalacion>
  );
}
