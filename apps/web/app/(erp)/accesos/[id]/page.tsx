import { SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import type { SearchParams } from "@/lib/parametros";

import { cargarRegistro, cargarRegistros } from "../_componentes/datos";
import { DetalleRegistro } from "../_componentes/detalle-registro";
import { ListaRegistros, rutaAccesos } from "../_componentes/lista-registros";
import { SegmentoAccesos } from "../_componentes/segmento-accesos";

export const metadata = { title: "Accesos" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Registro dentro de la vista dividida; en teléfono, la ficha con «Atrás». */
export default function AccesoRegistro({ params, searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Accesos"
      ruta="/accesos"
      completo
      cargando="detalle"
      volverSoloTelefono
      volverBajoLg
      cargar={async () => {
        const { id } = await params;
        const [l, r] = await Promise.all([cargarRegistros(searchParams), cargarRegistro(id)]);
        return { ...l, id, ficha: r };
      }}
      opciones={(d) => ({
        volver: { href: rutaAccesos("/accesos", d.p), etiqueta: "Accesos" },
        ...(d.ficha.ok ? { titulo: d.ficha.data.nombre } : {}),
      })}
    >
      {(d) => (
        <>
          <SegmentoAccesos activa={d.p["estado"] === "en_sitio" ? "en_sitio" : "registros"} />
          <SplitScreen
            telefono="detalle"
            unPanelHastaLg
            etiquetaLista="Lista de accesos"
            etiquetaDetalle="Registro de acceso"
            lista={
              <ListaRegistros
                state={estadoPantalla(d.r)}
                items={d.r.ok ? d.r.data.items : []}
                siguiente={d.r.ok ? d.r.data.siguiente : null}
                p={d.p}
                instalaciones={d.instalaciones}
                seleccionado={d.id}
              />
            }
            detalle={
              <DetalleRegistro
                r={d.ficha.ok ? d.ficha.data : null}
                state={estadoPantalla(d.ficha)}
              />
            }
          />
        </>
      )}
    </PaginaPortal>
  );
}
