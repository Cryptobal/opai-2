import { Badge, KpiTile, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { ETIQUETA_ROL } from "@/app/_components/portales";

import { cantidad, usd } from "../../_componentes/formato";
import { AtencionTenant } from "./atencion-tenant";
import { DatosTributarios, type PerfilTributario } from "./datos-tributarios";
import type { DetalleTenant, PanelTenant, Trabajo } from "./tipos";

const ESTADO_MODULO = {
  activo: { etiqueta: "Activo", tono: "success" },
  trial: { etiqueta: "Trial", tono: "info" },
  suspendido: { etiqueta: "Suspendido", tono: "warning" },
} as const;

type Props = {
  d: DetalleTenant;
  panel: PanelTenant | null;
  problemas: Trabajo[];
  perfil: PerfilTributario | null;
};

/** Resumen de la empresa (49): consumo del mes, módulos, lo que necesita atención y datos. */
export function ResumenTenant({ d, panel, problemas, perfil }: Props) {
  const base = `/platform/tenants/${d.tenant.id}`;
  const m = panel?.mes;
  const t = panel?.trabajos;
  const keysAlerta = (panel?.keys ?? []).filter(
    (k) => !k.revocada && k.presupuestoUsd && k.gastadoUsd >= k.presupuestoUsd * 0.8,
  );
  const owners = d.administradores.filter((a) => a.rol === "owner").map((a) => a.nombre);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          etiqueta="IA del mes"
          valor={usd(m?.iaUsd)}
          variacion={{ texto: `${cantidad(m?.iaTokens ?? 0)} tokens`, tono: "neutro" }}
        />
        <KpiTile
          etiqueta="Correos"
          valor={cantidad(m?.correos ?? 0)}
          variacion={{ texto: "este mes", tono: "neutro" }}
        />
        <KpiTile
          etiqueta="Llamadas API y MCP"
          valor={cantidad(m?.llamadas ?? 0)}
          variacion={{
            texto: `${panel?.keys.filter((k) => !k.revocada).length ?? 0} keys activas`,
            tono: "neutro",
          }}
        />
        <KpiTile
          etiqueta="Trabajos con problemas"
          valor={String((t?.fallidos ?? 0) + (t?.reintentando ?? 0))}
          variacion={
            t && (t.fallidos || t.reintentando)
              ? { texto: `${t.fallidos} fallido · ${t.reintentando} reintentando`, tono: "danger" }
              : { texto: "Sin problemas", tono: "neutro" }
          }
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <SeccionTarjeta
          titulo="Módulos"
          sinRelleno
          accion={
            <EnlaceBoton href={`${base}/modulos`} variante="ghost">
              Gestionar
            </EnlaceBoton>
          }
        >
          <ul>
            <li className="flex min-h-12 items-center justify-between border-b border-border px-4 last:border-b-0">
              <span className="text-base text-fg">Núcleo</span>
              <Badge punto={false}>Siempre</Badge>
            </li>
            {d.modulos.map((x) => {
              const e = x.estado ? ESTADO_MODULO[x.estado as keyof typeof ESTADO_MODULO] : null;
              return (
                <li
                  key={x.id}
                  className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 last:border-b-0"
                >
                  <span className="text-base text-fg">
                    {x.nombre} · {x.version}
                  </span>
                  {e ? (
                    <Badge tono={e.tono}>{e.etiqueta}</Badge>
                  ) : (
                    <Badge punto={false}>No contratado</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </SeccionTarjeta>
        <div className="flex flex-col gap-4">
          <AtencionTenant problemas={problemas} keys={keysAlerta} faltaRut={!perfil?.rut} />
          <DatosTributarios tenantId={d.tenant.id} perfil={perfil} />
          <SeccionTarjeta titulo="Datos">
            <ParesGrid
              items={[
                { etiqueta: "Zona horaria", valor: d.tenant.timezone },
                {
                  etiqueta: owners.length > 1 ? "Propietarios" : "Propietario",
                  valor: owners.join(", ") || null,
                },
                {
                  etiqueta: "Administradores",
                  valor:
                    d.administradores
                      .map((a) => `${a.nombre} (${ETIQUETA_ROL[a.rol] ?? a.rol})`)
                      .join(", ") || null,
                  ancho: true,
                },
              ]}
            />
          </SeccionTarjeta>
        </div>
      </div>
    </div>
  );
}
