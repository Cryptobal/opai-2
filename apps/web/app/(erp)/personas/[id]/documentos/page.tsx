import { Upload } from "lucide-react";

import { FichaDocumentos } from "@/app/_components/documentos/ficha-documentos";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import type { SearchParams } from "@/lib/parametros";

import { consultaExtra } from "../../_componentes/lista-personas";
import { PaginaPersona } from "../../_componentes/pagina-persona";

export const metadata = { title: "Documentos de la persona" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Persona · Documentos (16): vigencias, subir (17) y vista previa (18). */
export default function DocumentosPersona(props: Props) {
  return (
    <PaginaPersona
      {...props}
      tab="documentos"
      acciones={(q) => (
        <EnlaceBotonHoja
          href={`?subir=1${consultaExtra(q)}`}
          icono={Upload}
          className="max-lg:hidden"
        >
          Subir documento
        </EnlaceBotonHoja>
      )}
    >
      {(p, q) => (
        <FichaDocumentos entidad={{ tipo: "persona", id: p.id }} consulta={consultaExtra(q)} />
      )}
    </PaginaPersona>
  );
}
