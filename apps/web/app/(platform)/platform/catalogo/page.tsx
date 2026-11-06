import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { exigirDatos } from "@/lib/carga";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import { Superadmin } from "../_componentes/formato";
import type { EntradaCatalogo } from "../facturacion/_componentes/cobro";
import { ListaCatalogo } from "./_componentes/lista-catalogo";

export const metadata = { title: "Catálogo" };

/**
 * Plataforma → Catálogo (CAR-204, ADR-071 adenda y ADR-072): el plan base, los módulos y las siete
 * partes de Finanzas, con lo que incluye cada uno, su precio de lista y sus dependencias. El rol
 * `support` lo ve en solo lectura. Sin diseño aprobado: usa el patrón de la pestaña Cobro.
 */
export default function Catalogo() {
  return (
    <PaginaPortal
      portal="platform"
      titulo="Catálogo"
      ruta="/platform/catalogo"
      opciones={() => ({ insignia: <Superadmin /> })}
      cargar={async () => {
        const [identidad, r] = await Promise.all([
          requerirIdentidad("/platform/catalogo"),
          ejecutarComoUsuario<EntradaCatalogo[]>("platform", "platform.catalogo.list", {}),
        ]);
        return {
          entradas: exigirDatos(r),
          puedeEditar: puedeDeIdentidad(identidad)(PERMISOS_PLATAFORMA.tenantsManage),
        };
      }}
    >
      {(d) => (
        <>
          <ListaCatalogo entradas={d.entradas} puedeEditar={d.puedeEditar} />
        </>
      )}
    </PaginaPortal>
  );
}
