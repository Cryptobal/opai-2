import type { SearchParams } from "@/lib/parametros";

import { PestanaPersonas } from "../../_componentes/personas/pestana-personas";
import { PaginaInstalacion } from "../../_componentes/pagina-instalacion";

export const metadata = { title: "Personas de la instalación" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Tab Personas (CAR-596): dotación desde Pauta y vínculos vigentes. */
export default function PersonasInstalacion(props: Props) {
  return (
    <PaginaInstalacion {...props} tab="personas">
      {(i, p) => <PestanaPersonas instalacionId={i.id} parametros={p} />}
    </PaginaInstalacion>
  );
}