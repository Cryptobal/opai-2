import type { SearchParams } from "@/lib/parametros";

import { PestanaAccesos } from "../../../accesos/_componentes/pestana-accesos";
import { PaginaInstalacion } from "../../_componentes/pagina-instalacion";

export const metadata = { title: "Accesos de la instalación" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Tab Accesos (CAR-475): registros, en sitio, prerregistros, intentos denegados, listas y configuración de una instalación. */
export default function AccesosInstalacion(props: Props) {
  return (
    <PaginaInstalacion {...props} tab="accesos">
      {(i, p) => (
        <PestanaAccesos
          instalacion={{ id: i.id, nombre: i.nombre }}
          base={`/instalaciones/${i.id}/accesos`}
          sub={p["sub"]}
          lista={p["lista"]}
          cursor={p["cursor"]}
        />
      )}
    </PaginaInstalacion>
  );
}
