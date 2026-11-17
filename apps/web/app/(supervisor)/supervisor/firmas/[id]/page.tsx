import { notFound } from "next/navigation";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { FirmarSesion } from "@/app/_components/firmas/firmar-sesion";
import { VolverALista } from "@/app/_components/firmas/lista-pendientes";
import { ETIQUETA_CLASE } from "@/app/_components/firmas/etiquetas";
import { verFirmaSesion } from "@/app/_components/firmas/acciones-sesion";
import { estadoPantalla } from "@/lib/formato";

type Props = { params: Promise<{ id: string }> };

/** Flujo de firma en el portal Supervisor (CAR-634). */
export default function Pagina({ params }: Props) {
  const portal = "supervisor";
  const listaHref = "/supervisor/firmas";
  return (
    <PaginaPortal
      portal={portal}
      titulo="Firmar documento"
      ruta={listaHref}
      cargando="formulario"
      cargar={async () => {
        const { id } = await params;
        const ruta = `${listaHref}/${id}`;
        const r = await verFirmaSesion(portal, id);
        if (!r.ok && r.error.code === "NOT_FOUND") notFound();
        return { id, ruta, state: estadoPantalla(r), datos: r.ok ? r.data : null };
      }}
      opciones={(d) => ({
        titulo: d.datos ? `Firmar · ${ETIQUETA_CLASE[d.datos.clase] ?? d.datos.clase}` : "Firmar documento",
        volver: { href: listaHref, etiqueta: "Firmas" },
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