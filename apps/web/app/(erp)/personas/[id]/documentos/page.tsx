import { Upload } from "lucide-react";

import { FichaDocumentos } from "@/app/_components/documentos/ficha-documentos";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import type { SearchParams } from "@/lib/parametros";

import { PaginaPersona } from "../../_componentes/pagina-persona";

export const metadata = { title: "Documentos de la persona" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Persona · Documentos (16): vigencias, subir (17) y vista previa (18). */
export default function DocumentosPersona(props: Props) {
  return (
    <PaginaPersona
      {...props}
      tab="documentos"
      acciones={
        <EnlaceBotonHoja href="?subir=1" icono={Upload}>
          Subir documento
        </EnlaceBotonHoja>
      }
    >
      {(p) => <FichaDocumentos entidad={{ tipo: "persona", id: p.id }} />}
    </PaginaPersona>
  );
}
