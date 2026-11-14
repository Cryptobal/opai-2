import { DoorOpen } from "lucide-react";

import { SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { puedeGestionarRegistros } from "@/lib/pestanas-modulos";
import type { SearchParams } from "@/lib/parametros";

import { CerrarEnBloque } from "./_componentes/acciones-registro";
import { cargarRegistros } from "./_componentes/datos";
import { ListaRegistros } from "./_componentes/lista-registros";
import { SegmentoAccesos } from "./_componentes/segmento-accesos";

export const metadata = { title: "Accesos" };

/** Accesos (CAR-474, diseño `Accesos`): registros de todas las instalaciones a cargo, con ficha a la derecha. */
export default function Accesos({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Accesos"
      ruta="/accesos"
      completo
      cargar={async () => {
        const [l, gestiona] = await Promise.all([
          cargarRegistros(searchParams),
          puedeGestionarRegistros(),
        ]);
        return { ...l, gestiona };
      }}
    >
      {(d) => (
        <>
          <SegmentoAccesos activa={d.p["estado"] === "en_sitio" ? "en_sitio" : "registros"} />
          <SplitScreen
            telefono="lista"
            unPanelHastaLg
            etiquetaLista="Lista de accesos"
            vacio={{ texto: "Elige un registro", icono: DoorOpen }}
            lista={
              <ListaRegistros
                state={estadoPantalla(d.r)}
                items={d.r.ok ? d.r.data.items : []}
                siguiente={d.r.ok ? d.r.data.siguiente : null}
                p={d.p}
                instalaciones={d.instalaciones}
                {...(d.gestiona && d.p["estado"] === "en_sitio" && d.p["instalacion"] && d.r.ok
                  ? {
                      accion: (
                        <CerrarEnBloque
                          instalacionId={d.p["instalacion"]}
                          cuantos={d.r.data.items.length}
                        />
                      ),
                    }
                  : {})}
              />
            }
          />
        </>
      )}
    </PaginaPortal>
  );
}
