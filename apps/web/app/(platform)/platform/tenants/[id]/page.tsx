import { ejecutarComoUsuario } from "@/lib/servidor";

import { trabajosDe } from "./datos";
import type { Resumen } from "../../facturacion/_componentes/cobro";
import type { PerfilTributario } from "./datos-tributarios";
import { PaginaTenant } from "./pagina-tenant";
import { ResumenTenant } from "./resumen-tenant";

export const metadata = { title: "Empresa" };

/** Plataforma → empresa · Resumen (49). */
export default function Pagina({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaTenant params={params} tab="resumen">
      {async (d, panel) => {
        const [t, perfil, cobro] = await Promise.all([
          trabajosDe(d.tenant.id, true, 5),
          ejecutarComoUsuario<PerfilTributario>("platform", "platform.tenants.perfil_get", {
            tenantId: d.tenant.id,
          }),
          ejecutarComoUsuario<Resumen>("platform", "platform.cobros.resumen", {
            tenantId: d.tenant.id,
          }),
        ]);
        return (
          <ResumenTenant
            d={d}
            panel={panel}
            problemas={t.items}
            perfil={perfil.ok ? perfil.data : null}
            pruebas={cobro.ok ? (cobro.data.pruebasPorVencer ?? []) : []}
          />
        );
      }}
    </PaginaTenant>
  );
}
