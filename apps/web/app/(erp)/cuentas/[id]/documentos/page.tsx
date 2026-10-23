import { Upload } from "lucide-react";

import { FichaDocumentos } from "@/app/_components/documentos/ficha-documentos";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import type { SearchParams } from "@/lib/parametros";

import { PaginaCuenta } from "../../_componentes/pagina-cuenta";

export const metadata = { title: "Documentos de la cuenta" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

export default function DocumentosCuenta(props: Props) {
  return (
    <PaginaCuenta
      {...props}
      tab="documentos"
      acciones={
        <EnlaceBoton href="?subir=1" icono={Upload}>
          Subir documento
        </EnlaceBoton>
      }
    >
      {(c) => <FichaDocumentos entidad={{ tipo: "cuenta", id: c.id }} />}
    </PaginaCuenta>
  );
}
