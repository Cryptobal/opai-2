import { PaginaPortal } from "@/app/_components/pagina-portal";

import { NuevoTenant } from "./nuevo-tenant";

export const metadata = { title: "Nueva empresa" };

export default function Nuevo() {
  return (
    <PaginaPortal portal="platform" titulo="Nueva empresa" ruta="/platform/tenants/nuevo">
      <NuevoTenant />
    </PaginaPortal>
  );
}
