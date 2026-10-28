import { PrivacidadTitular } from "@/app/_components/cumplimiento/privacidad-titular";
import type { SearchParams } from "@/lib/parametros";

import { PaginaPersona } from "../../_componentes/pagina-persona";

export const metadata = { title: "Privacidad de la persona" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Persona · Privacidad (Brief 07d bloque 8): consentimientos y solicitudes del titular (Ley 21.719). */
export default function PrivacidadPersona(props: Props) {
  return (
    <PaginaPersona {...props} tab="privacidad">
      {(p) => (
        <PrivacidadTitular titular={{ tipo: "persona", id: p.id, nombre: p.nombreCompleto }} />
      )}
    </PaginaPersona>
  );
}
