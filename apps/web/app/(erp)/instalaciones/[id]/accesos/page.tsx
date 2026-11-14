import type { SearchParams } from "@/lib/parametros";

import { PestanaAccesos } from "../../../accesos/_componentes/pestana-accesos";
import { PaginaInstalacion } from "../../_componentes/pagina-instalacion";

export const metadata = { title: "Accesos de la instalación" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Tab Accesos (CAR-475): registros, en sitio, intentos denegados y listas de una instalación. */
export default function AccesosInstalacion(props: Props) {
  return (
    <PaginaInstalacion {...props} tab="accesos">
      {(i, p) => (
        <PestanaAccesos
          instalacionId={i.id}
          base={`/instalaciones/${i.id}/accesos`}
          sub={p["sub"]}
          lista={p["lista"]}
        />
      )}
    </PaginaInstalacion>
  );
}
