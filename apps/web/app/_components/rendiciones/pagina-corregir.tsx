import dynamic from "next/dynamic";
import { redirect } from "next/navigation";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { hoyIso } from "@/lib/fechas";

import { cargarOpciones, cargarRendicion } from "./datos";
import { BASE, type PortalRendicion } from "./tipos";

// Cada formulario en su propio fragmento (next/dynamic): la ruta solo carga el del tipo de la rendición (ADR-037).
const FormCompra = dynamic(() => import("./nueva/form-compra").then((m) => m.FormCompra));
const FormKm = dynamic(() => import("./nueva/form-km").then((m) => m.FormKm));

/** Corregir y reenviar una devuelta (o terminar un borrador): el mismo formulario, con los datos cargados. */
export function PaginaCorregir({
  portal,
  params,
}: {
  portal: PortalRendicion;
  params: Promise<{ id: string }>;
}) {
  const base = BASE[portal];
  return (
    <PaginaPortal
      portal={portal}
      titulo="Corregir rendición"
      ruta={`${base}/nueva`}
      cargando="formulario"
      volver={{ href: base, etiqueta: "Mis rendiciones" }}
      cargar={async () => {
        const { id } = await params;
        const r = await cargarRendicion(portal, id);
        // Solo un borrador o una devuelta se edita; las demás vuelven a su ficha.
        if (r.estado !== "borrador" && r.estado !== "devuelta") redirect(`${base}/${id}`);
        return { r, o: await cargarOpciones(portal, id) };
      }}
    >
      {({ r, o }) =>
        r.tipo === "kilometraje" ? (
          <FormKm portal={portal} opciones={o} hoy={hoyIso()} inicial={r} />
        ) : (
          <FormCompra portal={portal} opciones={o} hoy={hoyIso()} inicial={r} />
        )
      }
    </PaginaPortal>
  );
}
