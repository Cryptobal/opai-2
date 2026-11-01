import { Forbidden } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { exigirDatos } from "@/lib/carga";
import { accesoCpq } from "@/lib/cpq-ui";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { FormularioCrear } from "../_componentes/formulario-crear";

export const metadata = { title: "Nueva cotización" };
export default function NuevaCotizacion({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Nueva cotización"
      ruta="/cotizaciones/nueva"
      cargando="formulario"
      volver={{ href: "/cotizaciones", etiqueta: "Cotizaciones" }}
      cargar={async () => {
        const acceso = accesoCpq(await identidadActual());
        if (!acceso.crear) return { permitido: false, inicial: null };
        const p = await leerParametros(searchParams);
        if (!p["negocio"]) return { permitido: true, inicial: null };
        const r = await ejecutarComoUsuario<{ id: string; titulo: string }>(
          "erp",
          "comercial.negocios.get",
          {
            id: requerirUuid(p["negocio"]),
          },
        );
        requerirEncontrado(r);
        const n = exigirDatos(r);
        return { permitido: true, inicial: { valor: n.id, etiqueta: n.titulo } };
      }}
    >
      {(d) => (d.permitido ? <FormularioCrear inicial={d.inicial} /> : <Forbidden />)}
    </PaginaPortal>
  );
}
