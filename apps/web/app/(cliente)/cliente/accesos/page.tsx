import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { type Pagina, type Registro, uuid } from "@/app/(erp)/accesos/_componentes/datos";
import { exigirDatos } from "@/lib/carga";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { AccesosCliente, type Instalacion } from "./_componentes/accesos-cliente";

export const metadata = { title: tituloPagina("cliente", "Accesos") };

/**
 * Accesos del Portal Cliente (CAR-481, diseño `ClienteAccesos`): quién está en sitio y los registros de las
 * instalaciones de su cuenta, de solo lectura. El alcance lo aplica la capacidad en la consulta (ADR-022).
 */
export default function Accesos({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="cliente"
      titulo="Accesos"
      ruta="/cliente/accesos"
      cargando="lista"
      cargar={async () => {
        const p = await leerParametros(searchParams);
        const instalacion = uuid(p["instalacion"]);
        const cursor = uuid(p["cursor"]);
        const enSitio = p["vista"] !== "registros";
        const [r, yo] = await Promise.all([
          ejecutarComoUsuario<Pagina<Registro>>("cliente", "acceso.portal_registros.listar", {
            soloEnSitio: enSitio,
            ...(instalacion ? { instalacionId: instalacion } : {}),
            ...(cursor ? { cursor } : {}),
          }),
          ejecutarComoUsuario<{ instalaciones: Instalacion[] }>("cliente", "portal_cliente.mi_acceso", {}),
        ]);
        return {
          ...exigirDatos(r),
          instalaciones: yo.ok ? yo.data.instalaciones : [],
          instalacion,
          enSitio,
        };
      }}
    >
      {(d) => <AccesosCliente {...d} />}
    </PaginaPortal>
  );
}
