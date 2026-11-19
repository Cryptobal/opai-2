import { Estado } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { BotonReintentar } from "@/app/_components/boton-reintentar";
import {
  ListaFirmasPendientes,
  type FirmaPendiente,
} from "@/app/_components/firmas/lista-pendientes";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

export const metadata = { title: "Firmas" };

/** Por firmar en el portal Supervisor (CAR-634), paridad con 1.0 portal/supervisor/firmas. */
export default function Pagina() {
  const portal = "supervisor";
  const baseHref = "/supervisor/firmas";
  return (
    <PaginaPortal
      portal={portal}
      titulo="Firmas"
      ruta={baseHref}
      cargando="lista"
      cargar={async () => {
        const r = await ejecutarComoUsuario<{ items: FirmaPendiente[] }>(portal, "core.firmas.mis_pendientes", {});
        return { state: estadoPantalla(r), datos: r.ok ? r.data : null };
      }}
    >
      {({ state, datos }) => (
        <Estado
          state={state === "ready" && !datos?.items.length ? "empty" : state}
          variante="lista"
          textos={{
            vacio: {
              titulo: "No tienes documentos por firmar",
              descripcion: "Cuando te llegue algo para firmar, aparecerá aquí.",
            },
            error: { accion: <BotonReintentar /> },
          }}
        >
          <div className="flex flex-col gap-4">
            <p className="t-body-sm">Documentos que debes firmar electrónicamente.</p>
            {datos ? <ListaFirmasPendientes items={datos.items} baseHref={baseHref} /> : null}
          </div>
        </Estado>
      )}
    </PaginaPortal>
  );
}