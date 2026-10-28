import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { Cabecera, Estado } from "@opai/ds";

import { MatrizVencimientos } from "../_componentes/matriz-vencimientos";
import { SegmentoPersonas, SegmentoPersonasMovil } from "../_componentes/segmento";
import type { Matriz } from "../_componentes/tipos-matriz";

export const metadata = { title: "Vencimientos" };

/** Vencimientos (58/59): semáforo de documentos por persona y renovación en bloque. */
export default function Vencimientos({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Vencimientos"
      ruta="/personas"
      cargar={async () => {
        const r = await ejecutarComoUsuario<Matriz>("erp", "core.documentos.matriz", {});
        const params = await leerParametros(searchParams);
        return {
          state: estadoPantalla(r),
          m: r.ok ? r.data : null,
          desdeInicio: params["origen"] === "inicio",
        };
      }}
      opciones={({ desdeInicio }) => ({
        titulo: "Vencimientos",
        insignia: <SegmentoPersonas activa="vencimientos" plural="Personas" />,
        volver: desdeInicio
          ? { href: "/", etiqueta: "Inicio" }
          : { href: "/personas", etiqueta: "Personas" },
        volverSoloTelefono: !desdeInicio,
      })}
    >
      {({ state, m }) => (
        <div className="flex flex-col">
          <SegmentoPersonasMovil activa="vencimientos" />
          <div className="md:hidden">
            <Cabecera
              titulo="Vencimientos"
              {...(m && m.resumen.personas > 0
                ? { subtitulo: `${m.resumen.conPendientes} con algo pendiente` }
                : {})}
            />
          </div>
          <Estado state={m ? state : state === "ready" ? "error" : state} variante="lista">
            {m ? <MatrizVencimientos m={m} /> : null}
          </Estado>
        </div>
      )}
    </PaginaPortal>
  );
}
