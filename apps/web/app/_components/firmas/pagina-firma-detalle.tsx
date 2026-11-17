import { notFound } from "next/navigation";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { FirmarSesion } from "@/app/_components/firmas/firmar-sesion";
import { VolverALista } from "@/app/_components/firmas/lista-pendientes";
import { ETIQUETA_CLASE } from "@/app/_components/firmas/etiquetas";
import { verFirmaSesion } from "@/app/_components/firmas/acciones-sesion";
import { estadoPantalla } from "@/lib/formato";

type Config = {
  portal: string;
  listaHref: string;
  volverPortal?: { href: string; etiqueta: string };
  volverOpciones?: { href: string; etiqueta: string };
  volverSoloTelefono?: boolean;
};

/** Detalle de firma N1 compartido entre portales (CAR-634). */
export function PaginaFirmaDetalle({ config, params }: { config: Config; params: Promise<{ id: string }> }) {
  const { portal, listaHref, volverPortal, volverOpciones, volverSoloTelefono } = config;
  return (
    <PaginaPortal
      portal={portal}
      titulo="Firmar documento"
      ruta={listaHref}
      volver={volverPortal}
      volverSoloTelefono={volverSoloTelefono}
      cargando="formulario"
      cargar={async () => {
        const { id } = await params;
        const r = await verFirmaSesion(portal, id);
        if (!r.ok && r.error.code === "NOT_FOUND") notFound();
        return { id, state: estadoPantalla(r), datos: r.ok ? r.data : null };
      }}
      opciones={(d) => ({
        titulo: d.datos ? `Firmar · ${ETIQUETA_CLASE[d.datos.clase] ?? d.datos.clase}` : "Firmar documento",
        volver: volverOpciones,
      })}
    >
      {({ id, datos }) =>
        datos ? (
          <div className="flex flex-col gap-4">
            <FirmarSesion portal={portal} solicitudId={id} volverHref={listaHref} datos={datos} />
            <VolverALista href={listaHref} />
          </div>
        ) : null
      }
    </PaginaPortal>
  );
}