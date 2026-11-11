import dynamic from "next/dynamic";

import { Estado, SeccionTarjeta } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaConfig } from "../_centro/pagina-config";
import type { Catalogo, Lote } from "./tipos";

export const metadata = { title: "Importar datos" };

// El asistente y el historial se cargan aparte del primer JS (ADR-037).
const AsistenteImportar = dynamic(() => import("./asistente").then((m) => m.AsistenteImportar));
const LotesImportacion = dynamic(() => import("./lotes").then((m) => m.LotesImportacion));

/**
 * Importar datos (CAR-279): carga de cuentas, contactos, instalaciones y negocios desde una planilla,
 * con simulación antes de guardar y lotes reversibles. Lo mismo está disponible por MCP (`core.importar.*`).
 */
export default function ImportarDatos() {
  return (
    <PaginaConfig
      seccion="importar"
      titulo="Importar datos"
      cargar={async () => {
        const [c, l] = await Promise.all([
          ejecutarComoUsuario<Catalogo>("erp", "core.importar.catalogo", {}),
          ejecutarComoUsuario<{ items: Lote[] }>("erp", "core.importar.lotes", { limite: 30 }),
        ]);
        return { c, l };
      }}
      cabecera={() => ({ subtitulo: "Trae tus clientes desde una planilla Excel o CSV" })}
    >
      {({ c, l }) => (
        <div className="flex flex-col gap-4">
          <SeccionTarjeta titulo="Cargar una planilla">
            <Estado state={estadoPantalla(c)} variante="formulario">
              {c.ok ? (
                <div className="flex flex-col gap-3">
                  <p className="t-body-sm">
                    Importa en este orden: primero las cuentas, después sus contactos, instalaciones y negocios. Antes de
                    guardar verás una simulación fila por fila. Repetir una carga no duplica registros.
                  </p>
                  <AsistenteImportar catalogo={c.data} />
                </div>
              ) : null}
            </Estado>
          </SeccionTarjeta>
          <SeccionTarjeta titulo="Cargas anteriores">
            <Estado
              state={l.ok && l.data.items.length === 0 ? "empty" : estadoPantalla(l)}
              variante="lista"
              textos={{ vacio: { titulo: "Todavía no hay cargas", descripcion: "Cuando importes una planilla, aquí quedará el lote con lo que creó y la opción de revertirlo." } }}
            >
              <LotesImportacion
                lotes={l.ok ? l.data.items : []}
                nombres={Object.fromEntries((c.ok ? c.data.importadores : []).map((i) => [i.id, i.etiqueta]))}
              />
            </Estado>
          </SeccionTarjeta>
        </div>
      )}
    </PaginaConfig>
  );
}
