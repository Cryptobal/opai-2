import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { type DetalleTenant, TenantDetalle } from "./tenant-detalle";

export const metadata = { title: "Empresa" };

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await ejecutarComoUsuario<DetalleTenant>("platform", "platform.tenants.get", {
    tenantId: id,
  });
  return <TenantDetalle state={estadoPantalla(r)} detalle={r.ok ? r.data : null} />;
}

export default function Pagina({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaPortal portal="platform" titulo="Empresa" ruta="/platform">
      <Contenido params={params} />
    </PaginaPortal>
  );
}
