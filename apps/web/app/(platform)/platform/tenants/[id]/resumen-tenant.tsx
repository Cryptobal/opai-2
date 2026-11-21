import { KpiTile, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { ETIQUETA_ROL } from "@/app/_components/portales";

import { cantidad, usd } from "../../_componentes/formato";
import type { Resumen } from "../../facturacion/_componentes/cobro";
import { AtencionTenant } from "./atencion-tenant";
import { DatosTributarios, type PerfilTributario } from "./datos-tributarios";
import type { DetalleTenant, PanelTenant, Trabajo } from "./tipos";

import { agruparModulosPorArea, TEXTO_ESTADO } from "./modulos-vista";

type Props = {
  d: DetalleTenant;
  panel: PanelTenant | null;
  problemas: Trabajo[];
  perfil: PerfilTributario | null;
  pruebas: Resumen["pruebasPorVencer"];
};

/** Resumen de la empresa (49): consumo del mes, módulos, lo que necesita atención y datos. */
export function ResumenTenant({ d, panel, problemas, perfil, pruebas }: Props) {
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
          <ul className="flex flex-col gap-3 px-4 pb-2">
            <li className="flex justify-between gap-3 text-sm">
              <span className="text-fg">Núcleo</span>
              <span className="text-muted-fg">Siempre activo</span>
            </li>
            {agruparModulosPorArea(d.modulos).map((g) => (
              <li key={g.area}>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-fg">
                  {g.titulo}
                </p>
                <ul className="flex flex-col gap-1">
                  {g.filas.map((x) => (
                    <li
                      key={x.id}
                      className={`flex justify-between gap-3 text-sm ${x.complemento ? "pl-3" : ""}`}
                    >
                      <span className="text-fg">
                        {x.nombre}
                        {x.complemento && x.etiquetaCobro ? (
                          <span className="text-muted-fg"> · {x.etiquetaCobro}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-muted-fg">
                        {x.estado ? (TEXTO_ESTADO[x.estado] ?? x.estado) : "No contratado"}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </SeccionTarjeta>
        <div className="flex flex-col gap-4">
          <AtencionTenant
            problemas={problemas}
            keys={keysAlerta}
            faltaRut={!perfil?.rut}
            pruebas={pruebas}
          />
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
