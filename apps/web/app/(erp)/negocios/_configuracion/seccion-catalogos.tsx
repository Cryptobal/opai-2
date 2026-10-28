import { Estado } from "@opai/ds";

import { cargarConfigComercial } from "./datos";
import { EditorCatalogo } from "./editor-catalogo";

/** Pestaña «Catálogos»: motivos de pérdida, tipos de negocio y orígenes, editables por empresa. */
export async function SeccionCatalogos() {
  const { state, config } = await cargarConfigComercial();
  return (
    <Estado state={config ? state : state === "ready" ? "error" : state} variante="formulario">
      {config ? (
        <div className="flex flex-col gap-4">
          <EditorCatalogo
            catalogo="motivo"
            titulo="Motivos de pérdida"
            descripcion="Obligatorio al perder un negocio; «Otro» pide un detalle."
            items={config.motivos}
          />
          <EditorCatalogo
            catalogo="tipo"
            titulo="Tipos de negocio"
            descripcion="Qué se vende: cliente, instalación o cambio de dotación."
            items={config.tipos}
          />
          <EditorCatalogo
            catalogo="origen"
            titulo="Orígenes"
            descripcion="Cómo llegó el negocio."
            items={config.origenes}
          />
          <p className="t-caption">
            Un valor en uso no se elimina: se desactiva y deja de ofrecerse en negocios nuevos. Los
            negocios que ya lo tienen lo conservan.
          </p>
        </div>
      ) : null}
    </Estado>
  );
}
