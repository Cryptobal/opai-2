import { Empty } from "@opai/ds";

import type { SearchParams } from "@/lib/parametros";

import { PaginaNegocio } from "../../_componentes/pagina-negocio";

export const metadata = { title: "Documentos del negocio" };
type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Negocio · Documentos: los adjuntos del negocio (vínculos de core.documentos) llegan con el PR 2. */
export default function DocumentosDelNegocio(props: Props) {
  return (
    <PaginaNegocio {...props} tab="documentos">
      {() => (
        <Empty
          titulo="Sin documentos"
          descripcion="Los documentos del negocio se vincularán aquí (core.documentos)."
        />
      )}
    </PaginaNegocio>
  );
}
