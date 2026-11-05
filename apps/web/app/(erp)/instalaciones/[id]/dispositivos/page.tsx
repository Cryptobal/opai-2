import type { SearchParams } from "@/lib/parametros";

import { PaginaInstalacion } from "../../_componentes/pagina-instalacion";
import { PestanaDispositivos } from "../../_componentes/dispositivos/pestana-dispositivos";

export const metadata = { title: "Dispositivos de la instalación" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Pestaña Dispositivos (CAR-78 · B2): equipos de terreno emparejados a la instalación. */
export default function DispositivosInstalacion(props: Props) {
  return (
    <PaginaInstalacion {...props} tab="dispositivos">
      {(i) => <PestanaDispositivos instalacionId={i.id} />}
    </PaginaInstalacion>
  );
}
