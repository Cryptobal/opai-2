import type { SearchParams } from "@/lib/parametros";

import { FichaAnexos } from "@/app/_components/anexos/ficha-anexos";
import { PaginaPersona } from "../../_componentes/pagina-persona";

export const metadata = { title: "Anexos de contrato" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Persona · Anexos (26-30, D16): historial de anexos de contrato de la persona. El permiso
 * (D8, owner/admin) lo filtra `core.anexos.list` en la consulta, nunca aquí (ADR-022). */
export default function AnexosPersona(props: Props) {
  return (
    <PaginaPersona {...props} tab="anexos" acciones={<></>}>
      {(p) => <FichaAnexos personaId={p.id} />}
    </PaginaPersona>
  );
}
