import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PestanasDocumentos } from "../_componentes/pestanas-documentos";
import { ListaPlantillas, type FilaPlantilla } from "./_componentes/lista-plantillas";

export const metadata = { title: "Plantillas" };

/**
 * Plantillas laborales de Documentos (v4 · 05). Solo owner y admin (`documentos.plantillas.manage`):
 * sin el permiso la pestaña se oculta y la ruta muestra «sin permisos». Las salidas comerciales
 * viven en CPQ y no se listan aquí.
 */
export default function Plantillas() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Documentos"
      ruta="/documentos/plantillas"
      completo
      cargar={async () => {
        const r = await ejecutarComoUsuario<FilaPlantilla[]>(
          "erp",
          "core.documento_plantillas.list",
          {},
        );
        return { state: estadoPantalla(r), plantillas: r.ok ? r.data : [] };
      }}
    >
      {(d) => (
        <>
          <PestanasDocumentos activa="plantillas" />
          <ListaPlantillas state={d.state} plantillas={d.plantillas} />
        </>
      )}
    </PaginaPortal>
  );
}
