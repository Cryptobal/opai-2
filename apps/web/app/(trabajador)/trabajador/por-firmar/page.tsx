import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import {
  ListaFirmasPendientes,
  type FirmaPendiente,
} from "@/app/_components/firmas/lista-pendientes";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { estadoTrabajador } from "../_componentes/estado";
import { EstadoLista } from "../_componentes/estado-lista";

export const metadata = { title: tituloPagina("trabajador", "Por firmar") };

/** Por firmar (CAR-634): lo que el trabajador debe firmar en su portal, con el mismo flujo que el enlace del correo. */
export default function Pagina() {
  const portal = "trabajador";
  const baseHref = "/trabajador/por-firmar";
  return (
    <PaginaPortal
      portal={portal}
      titulo="Por firmar"
      ruta={baseHref}
      volver={{ href: "/trabajador/mas", etiqueta: "Más" }}
      volverSoloTelefono
      cargando="lista"
      cargar={async () => {
        const r = await ejecutarComoUsuario<{ items: FirmaPendiente[] }>(portal, "core.firmas.mis_pendientes", {});
        return { state: estadoTrabajador(r), datos: r.ok ? r.data : null };
      }}
    >
      {({ state, datos }) => (
        <EstadoLista state={state}>
          <div className="flex flex-col gap-4">
            <p className="t-body-sm md:hidden">Documentos que debes firmar electrónicamente.</p>
            {datos ? <ListaFirmasPendientes items={datos.items} baseHref={baseHref} /> : null}
          </div>
        </EstadoLista>
      )}
    </PaginaPortal>
  );
}