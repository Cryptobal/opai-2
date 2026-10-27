import { VERTICALES } from "@opai/domain";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { Superadmin } from "./_componentes/formato";
import { type TenantFila, TenantsLista } from "./tenants-lista";

export const metadata = { title: "Plataforma" };

const sinTildes = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Plataforma → Empresas (48). Búsqueda y filtros en servidor sobre la lista completa. */
export default function Plataforma({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="platform"
      titulo="Empresas"
      ruta="/platform"
      opciones={() => ({ insignia: <Superadmin /> })}
      cargar={async () => {
        const [r, p] = await Promise.all([
          ejecutarComoUsuario<TenantFila[]>("platform", "platform.tenants.list"),
          leerParametros(searchParams),
        ]);
        const q = sinTildes(p["q"] ?? "");
        const tenants = (r.ok ? r.data : []).filter(
          (t) =>
            (!q || sinTildes(`${t.nombre} ${t.slug}`).includes(q)) &&
            (!p["estado"] || t.estado === p["estado"]) &&
            (!p["vertical"] || t.vertical === p["vertical"]),
        );
        return { state: estadoPantalla(r), tenants };
      }}
    >
      {(d) => <TenantsLista state={d.state} tenants={d.tenants} verticales={[...VERTICALES]} />}
    </PaginaPortal>
  );
}
