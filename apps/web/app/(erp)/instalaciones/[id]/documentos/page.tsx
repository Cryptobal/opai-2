import { Upload } from "lucide-react";

import { FichaDocumentos } from "@/app/_components/documentos/ficha-documentos";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import type { SearchParams } from "@/lib/parametros";

import { PaginaInstalacion } from "../../_componentes/pagina-instalacion";

export const metadata = { title: "Documentos de la instalación" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

export default function DocumentosInstalacion(props: Props) {
  return (
    <PaginaInstalacion
      {...props}
      tab="documentos"
      acciones={
        <EnlaceBotonHoja href="?subir=1" icono={Upload}>
          Subir documento
        </EnlaceBotonHoja>
      }
    >
      {(i) => <FichaDocumentos entidad={{ tipo: "instalacion", id: i.id }} />}
    </PaginaInstalacion>
  );
}
