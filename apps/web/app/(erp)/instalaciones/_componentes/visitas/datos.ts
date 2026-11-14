import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { POR_PAGINA } from "../../../personas/_componentes/datos";
import type { Visita } from "./tipos";

/**
 * Visitas de supervisión de una instalación, de la más reciente a la más antigua (CAR-83). El cursor va
 * en `?vcursor=`: `cursor` y `prev` son de la lista de instalaciones de la izquierda.
 */
export async function cargarVisitas(instalacionId: string, p: Parametros) {
  return ejecutarComoUsuario<{ items: Visita[]; siguiente: string | null }>(
    "erp",
    "pauta.visitas.listar",
    {
      instalacionId,
      limite: POR_PAGINA,
      ...(p["vcursor"] ? { cursor: p["vcursor"] } : {}),
    },
  );
}
