import { LinkNext } from "@/app/_components/link-next";
import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import type { SearchParams } from "@/lib/parametros";

import { cargarIntentos } from "../_componentes/datos";
import { OPCIONES_MOTIVO } from "../_componentes/etiquetas";
import { rutaAccesos } from "../_componentes/lista-registros";
import { SegmentoAccesos } from "../_componentes/segmento-accesos";
import { TablaIntentos } from "../_componentes/tabla-intentos";

export const metadata = { title: "Intentos denegados" };

/** Intentos denegados (R9): quién no pudo entrar y por qué categoría; nunca el texto del bloqueo. */
export default function IntentosDenegados({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Accesos"
      ruta="/accesos"
      completo
      cargar={() => cargarIntentos(searchParams)}
    >
      {(d) => (
        <>
          <SegmentoAccesos activa="intentos" />
          <TablaIntentos
            state={estadoPantalla(d.r)}
            items={d.r.ok ? d.r.data.items : []}
            filtros={
              <ChipsFiltro
                filtros={[
                  {
                    param: "instalacion",
                    etiqueta: "Instalación",
                    opciones: d.instalaciones.map((i) => ({ valor: i.id, etiqueta: i.nombre })),
                  },
                  { param: "motivo", etiqueta: "Motivo", opciones: OPCIONES_MOTIVO },
                ]}
              />
            }
          />
          {d.r.ok && d.r.data.siguiente ? (
            <LinkNext
              href={rutaAccesos("/accesos/intentos", d.p, { cursor: d.r.data.siguiente })}
              className="t-label mt-3 inline-block text-accent"
            >
              Siguiente página
            </LinkNext>
          ) : null}
        </>
      )}
    </PaginaPortal>
  );
}
