import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { puedeGestionarRegistros } from "@/lib/pestanas-modulos";

import { cargarRegistro } from "../_componentes/datos";
import { DetalleRegistro } from "../_componentes/detalle-registro";

export const metadata = { title: "Registro de acceso" };

/** Ficha de un registro; «Atrás» vuelve a la pestaña Accesos de su instalación. */
export default function AccesoRegistro({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Registro de acceso"
      ruta="/instalaciones"
      cargando="detalle"
      cargar={async () => {
        const [ficha, gestiona] = await Promise.all([
          cargarRegistro((await params).id),
          puedeGestionarRegistros(),
        ]);
        return { ficha, gestiona };
      }}
      opciones={(d) => ({
        volver: d.ficha.ok
          ? { href: `/instalaciones/${d.ficha.data.instalacionId}/accesos`, etiqueta: "Accesos" }
          : { href: "/instalaciones", etiqueta: "Instalaciones" },
        ...(d.ficha.ok ? { titulo: d.ficha.data.nombre } : {}),
      })}
    >
      {(d) => (
        <DetalleRegistro
          r={d.ficha.ok ? d.ficha.data : null}
          state={estadoPantalla(d.ficha)}
          gestiona={d.gestiona}
        />
      )}
    </PaginaPortal>
  );
}
