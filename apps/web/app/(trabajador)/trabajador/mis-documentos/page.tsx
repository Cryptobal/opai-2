import { Estado } from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { estadoTrabajador, SIN_FICHA } from "../_componentes/estado";
import { ListaDocumentos, type MiDocumento } from "./_componentes/lista-documentos";

export const metadata = { title: tituloPagina("trabajador", "Mis documentos") };

/**
 * Mis documentos (CAR-463, parte 2 de CAR-357): los documentos propios que la empresa dejó visibles en el portal. El
 * alcance (solo los suyos y solo los compartidos) lo aplica la capacidad en la consulta (ADR-022).
 */
export default function Pagina() {
  return (
    <PaginaPortal
      portal="trabajador"
      titulo="Mis documentos"
      ruta="/trabajador/mis-documentos"
      volver={{ href: "/trabajador/mas", etiqueta: "Más" }}
      volverSoloTelefono
      cargando="lista"
      cargar={async () => {
        const r = await ejecutarComoUsuario<{ hoy: string; items: MiDocumento[] }>(
          "trabajador",
          "portal_trabajador.mis_documentos.listar",
          { limite: 100 },
        );
        return { state: estadoTrabajador(r), datos: r.ok ? r.data : null };
      }}
    >
      {({ state, datos }) => (
        <Estado state={state} variante="lista" textos={{ vacio: SIN_FICHA, error: { accion: <BotonReintentar /> } }}>
          {datos ? <ListaDocumentos items={datos.items} hoy={datos.hoy} /> : null}
        </Estado>
      )}
    </PaginaPortal>
  );
}
