import type { ReactNode } from "react";

import { DetailScreen, Monograma } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type Parametros, type SearchParams } from "@/lib/parametros";

import { EstadoTenant, nombreVertical } from "../../_componentes/formato";
import { AccionesTenant } from "./acciones-tenant";
import { cargarTenant } from "./datos";
import type { DetalleTenant, PanelTenant } from "./tipos";

export type TabTenant =
  "resumen" | "modulos" | "usuarios" | "consumos" | "trabajos" | "agentes" | "integraciones";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: SearchParams;
  tab: TabTenant;
  children: (
    d: DetalleTenant,
    panel: PanelTenant | null,
    p: Parametros,
  ) => ReactNode | Promise<ReactNode>;
};

/** Plataforma → empresa (49): monograma, estado, slug y vertical; pestañas por ruta. */
export function PaginaTenant({ params, searchParams, tab, children }: Props) {
  return (
    <PaginaPortal
      portal="platform"
      titulo="Empresa"
      ruta="/platform"
      cargando="detalle"
      volver={{ href: "/platform", etiqueta: "Empresas" }}
      cargar={async () => {
        const [{ id }, p] = await Promise.all([
          params,
          searchParams ? leerParametros(searchParams) : {},
        ]);
        const d = await cargarTenant(id);
        return { ...d, contenido: d.detalle ? await children(d.detalle, d.panel, p) : null };
      }}
      opciones={(d) => ({ titulo: d.detalle?.tenant.nombre ?? "Empresa" })}
    >
      {({ state, detalle, panel, contenido }) => {
        const t = detalle?.tenant;
        const base = `/platform/tenants/${t?.id ?? ""}`;
        const activas = panel?.keys.filter((k) => !k.revocada).length ?? 0;
        const problemas = (panel?.trabajos.fallidos ?? 0) + (panel?.trabajos.reintentando ?? 0);
        return (
          <DetailScreen
            state={t ? state : state === "ready" ? "error" : state}
            titulo={t?.nombre ?? "Empresa"}
            {...(t && detalle
              ? {
                  inicio: <Monograma nombre={t.nombre} className="size-12 rounded-md text-base" />,
                  estado: (
                    <>
                      <EstadoTenant estado={t.estado} />
                      <span className="t-caption">
                        slug <span className="t-mono">{t.slug}</span> · {nombreVertical(t.vertical)}
                      </span>
                    </>
                  ),
                  acciones: <AccionesTenant id={t.id} nombre={t.nombre} estado={t.estado} />,
                }
              : {})}
            tabActiva={tab}
            Link={LinkNext}
            tabs={[
              { id: "resumen", etiqueta: "Resumen", href: base },
              {
                id: "modulos",
                etiqueta: "Módulos",
                contador:
                  detalle?.modulos.filter((m) => m.estado === "activo" || m.estado === "trial")
                    .length ?? 0,
                href: `${base}/modulos`,
              },
              {
                id: "usuarios",
                etiqueta: "Usuarios",
                contador: detalle?.administradores.length ?? 0,
                href: `${base}/usuarios`,
              },
              { id: "consumos", etiqueta: "Consumos", href: `${base}/consumos` },
              {
                id: "trabajos",
                etiqueta: "Trabajos",
                ...(problemas ? { contador: problemas } : {}),
                href: `${base}/trabajos`,
              },
              { id: "agentes", etiqueta: "Agentes", contador: activas, href: `${base}/agentes` },
              { id: "integraciones", etiqueta: "Integraciones", href: `${base}/integraciones` },
            ]}
          >
            {contenido}
          </DetailScreen>
        );
      }}
    </PaginaPortal>
  );
}
