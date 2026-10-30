import { Estado } from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { FormularioAvisos } from "../_componentes/formulario-avisos";
import { estadoTrabajador, SIN_FICHA } from "../_componentes/estado";
import type { Preferencias } from "../_componentes/tipos";

export const metadata = { title: tituloPagina("trabajador", "Notificaciones") };

export default function Pagina() {
  return (
    <PaginaPortal
      portal="trabajador"
      titulo="Notificaciones"
      ruta="/trabajador/notificaciones"
      volver={{ href: "/trabajador/mas", etiqueta: "Más" }}
      volverSoloTelefono
      cargar={async () => {
        const r = await ejecutarComoUsuario<Preferencias>(
          "trabajador",
          "portal_trabajador.preferencias_notificacion.obtener",
        );
        return { state: estadoTrabajador(r), datos: r.ok ? r.data : null };
      }}
    >
      {({ state, datos }) => (
        <Estado
          state={state}
          variante="formulario"
          textos={{ vacio: SIN_FICHA, error: { accion: <BotonReintentar /> } }}
        >
          {datos ? <FormularioAvisos inicial={datos} /> : null}
        </Estado>
      )}
    </PaginaPortal>
  );
}
