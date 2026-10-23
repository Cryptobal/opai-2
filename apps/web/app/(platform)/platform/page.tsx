import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { type TenantFila, TenantsLista } from "./tenants-lista";

export const metadata = { title: "Plataforma" };

async function Contenido() {
  const r = await ejecutarComoUsuario<TenantFila[]>("platform", "platform.tenants.list");
  return <TenantsLista state={estadoPantalla(r)} tenants={r.ok ? r.data : []} />;
}

export default function Plataforma() {
  return (
    <PaginaPortal portal="platform" titulo="Empresas" ruta="/platform">
      <Contenido />
    </PaginaPortal>
  );
}
