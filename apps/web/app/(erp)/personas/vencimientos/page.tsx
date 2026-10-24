import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { Estado } from "@opai/ds";

import { MatrizVencimientos } from "../_componentes/matriz-vencimientos";
import { SegmentoPersonas, SegmentoPersonasMovil } from "../_componentes/segmento";
import type { Matriz } from "../_componentes/tipos-matriz";

export const metadata = { title: "Vencimientos" };

/** Vencimientos (58/59): semáforo de documentos por persona y renovación en bloque. */
export default function Vencimientos() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Vencimientos"
      ruta="/personas"
      cargar={async () => {
        const r = await ejecutarComoUsuario<Matriz>("erp", "core.documentos.matriz", {});
        return { state: estadoPantalla(r), m: r.ok ? r.data : null };
      }}
      opciones={() => ({
        titulo: "Vencimientos",
        insignia: <SegmentoPersonas activa="vencimientos" plural="Personas" />,
        volver: { href: "/personas", etiqueta: "Personas" },
        volverSoloTelefono: true,
      })}
    >
      {({ state, m }) => (
        <div className="flex flex-col gap-3">
          <SegmentoPersonasMovil activa="vencimientos" />
          <div className="md:hidden">
            <h2 className="t-title text-fg">Vencimientos</h2>
            {m && m.resumen.personas > 0 ? (
              <p className="text-base text-fg-muted">
                {m.resumen.conPendientes} con algo pendiente
              </p>
            ) : null}
          </div>
          <Estado state={m ? state : state === "ready" ? "error" : state} variante="lista">
            {m ? <MatrizVencimientos m={m} /> : null}
          </Estado>
        </div>
      )}
    </PaginaPortal>
  );
}
