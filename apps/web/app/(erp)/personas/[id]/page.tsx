import { hoyIso } from "@/lib/fechas";
import type { SearchParams } from "@/lib/parametros";

import { HojaVincularUsuario } from "../_componentes/diferidas";
import { PaginaPersona } from "../_componentes/pagina-persona";
import { ResumenPersona } from "../_componentes/resumen-persona";

export const metadata = { title: "Persona" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Persona · Resumen (11/12). */
export default function Persona(props: Props) {
  return (
    <PaginaPersona {...props} tab="resumen">
      {(p) => (
        <>
          <ResumenPersona p={p} hoy={hoyIso()} />
          {p.usuarioId ? null : (
            <HojaVincularUsuario personaId={p.id} email={p.emailLaboral ?? p.emailPersonal} />
          )}
        </>
      )}
    </PaginaPersona>
  );
}
