import { Estado } from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { estadoTrabajador, SIN_FICHA } from "../_componentes/estado";
import { ListaSolicitudes, type Solicitud } from "./_componentes/lista-solicitudes";
import { PedirSolicitud } from "./_componentes/pedir-solicitud";

export const metadata = { title: tituloPagina("trabajador", "Solicitudes") };

/**
 * Solicitudes (CAR-464, parte 3 de CAR-357): el trabajador pide permisos o vacaciones y ve el estado de los suyos. El
 * alcance (solo su persona) lo aplica la capacidad en la consulta (ADR-022).
 */
export default function Pagina() {
  return (
    <PaginaPortal
      portal="trabajador"
      titulo="Solicitudes"
      ruta="/trabajador/solicitudes"
      volver={{ href: "/trabajador/mas", etiqueta: "Más" }}
      volverSoloTelefono
      cargando="lista"
      cargar={async () => {
        const r = await ejecutarComoUsuario<{ hoy: string; items: Solicitud[] }>(
          "trabajador",
          "portal_trabajador.solicitudes.listar",
          { limite: 100 },
        );
        return { state: estadoTrabajador(r), datos: r.ok ? r.data : null };
      }}
    >
      {({ state, datos }) => (
        <Estado state={state} variante="lista" textos={{ vacio: SIN_FICHA, error: { accion: <BotonReintentar /> } }}>
          {datos ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="t-title mb-1 text-fg md:hidden">Solicitudes</h2>
                  <p className="t-body-sm">Tus permisos y vacaciones. Tu jefatura responde cada solicitud.</p>
                </div>
                <PedirSolicitud hoy={datos.hoy} />
              </div>
              <ListaSolicitudes items={datos.items} />
            </div>
          ) : null}
        </Estado>
      )}
    </PaginaPortal>
  );
}
