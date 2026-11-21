import type { Resumen } from "../../facturacion/_componentes/cobro";
import { AtencionTenant } from "./atencion-tenant";
import { DatosTributarios, type PerfilTributario } from "./datos-tributarios";
import { ResumenDatosTenant } from "./resumen-datos-tenant";
import { ResumenKpis } from "./resumen-kpis";
import { ResumenModulosCard } from "./resumen-modulos-card";
import type { DetalleTenant, PanelTenant, Trabajo } from "./tipos";

type Props = {
  d: DetalleTenant;
  panel: PanelTenant | null;
  problemas: Trabajo[];
  perfil: PerfilTributario | null;
  pruebas: Resumen["pruebasPorVencer"];
};

/** Resumen de la empresa (49): consumo del mes, módulos, lo que necesita atención y datos. */
export function ResumenTenant({ d, panel, problemas, perfil, pruebas }: Props) {
  const keysAlerta = (panel?.keys ?? []).filter(
    (k) => !k.revocada && k.presupuestoUsd && k.gastadoUsd >= k.presupuestoUsd * 0.8,
  );
  return (
    <div className="flex flex-col gap-4">
      <ResumenKpis panel={panel} />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <ResumenModulosCard tenantId={d.tenant.id} modulos={d.modulos} />
        <div className="flex flex-col gap-4">
          <AtencionTenant
            problemas={problemas}
            keys={keysAlerta}
            faltaRut={!perfil?.rut}
            pruebas={pruebas}
          />
          <DatosTributarios tenantId={d.tenant.id} perfil={perfil} />
          <ResumenDatosTenant d={d} />
        </div>
      </div>
    </div>
  );
}