import { Badge, SeccionTarjeta } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla, fechaHora } from "@/lib/formato";
import { requerirEncontrado } from "@/lib/ids";

import { cargarDestino } from "../datos";
import { estadoDestino } from "../tarjeta-destino";
import { AccionesDestino } from "./acciones-destino";
import { ListaEntregas } from "./lista-entregas";

export const metadata = { title: "Destino de eventos" };

/** Un destino de eventos salientes: eventos suscritos, acciones y registro de entregas (CAR-352). */
export default function DestinoEventos({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Destino de eventos"
      ruta="/configuracion"
      cargando="detalle"
      volver={{ href: "/configuracion/agentes/eventos", etiqueta: "Eventos salientes" }}
      cargar={async () => {
        const { id } = await params;
        const { d, entregas, hayMas } = await cargarDestino(id);
        requerirEncontrado(d);
        return { state: estadoPantalla(d), d: d.ok ? d.data : null, entregas, hayMas };
      }}
      opciones={() => ({ titulo: "Destino de eventos" })}
    >
      {({ d, entregas, hayMas }) => {
        if (!d) return <Badge tono="danger">No encontramos este destino</Badge>;
        return (
          <div className="flex max-w-[720px] flex-col gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <span>{estadoDestino(d)}</span>
              <h2 className="t-mono text-base font-semibold break-all text-fg">{d.url}</h2>
              {d.descripcion ? <p className="text-base text-fg-muted">{d.descripcion}</p> : null}
              <p className="t-caption">
                Secreto <span className="t-mono">…{d.secretoSufijo}</span> · rotado{" "}
                {fechaHora(d.secretoRotadoEn)}
              </p>
            </div>
            <SeccionTarjeta titulo={`Eventos suscritos (${d.eventos.length})`}>
              <span className="flex flex-wrap gap-1.5">
                {d.eventos.map((e) => (
                  <Badge key={e} punto={false}>
                    {e}
                  </Badge>
                ))}
              </span>
            </SeccionTarjeta>
            <AccionesDestino id={d.id} activo={d.activo} />
            <SeccionTarjeta titulo="Entregas">
              <ListaEntregas entregas={entregas} hayMas={hayMas} />
            </SeccionTarjeta>
          </div>
        );
      }}
    </PaginaPortal>
  );
}
