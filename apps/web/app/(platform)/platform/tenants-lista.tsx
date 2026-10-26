import { Plus } from "lucide-react";

import { type EstadoPantalla, ListScreen, Monograma } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { Buscador } from "@/app/_components/maestros/buscador";
import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { haceCuanto } from "@/lib/fechas";

import { EstadoTenant, nombreVertical, usd } from "./_componentes/formato";

export type TenantFila = {
  id: string;
  slug: string;
  nombre: string;
  vertical: string;
  estado: string;
  modulosActivos: number;
  modulosTrial: number;
  usuarios: number;
  iaMesUsd: number;
  ultimoAcceso: string | null;
};

const num = "text-right t-numeric";
const modulos = (t: TenantFila) => {
  const fijos = t.modulosActivos - t.modulosTrial;
  if (!t.modulosTrial) return String(fijos);
  return fijos ? `${fijos} + ${t.modulosTrial} trial` : `${t.modulosTrial} trial`;
};

type Props = { state: EstadoPantalla; tenants: TenantFila[]; verticales: string[] };

/** Plataforma → Empresas (48): vertical, estado, módulos, usuarios, IA del mes y último acceso. */
export function TenantsLista({ state, tenants, verticales }: Props) {
  const nueva = (
    <EnlaceBoton href="/platform/tenants/nuevo" icono={Plus}>
      Nueva
    </EnlaceBoton>
  );
  return (
    <ListScreen<TenantFila>
      state={state}
      titulo="Empresas"
      subtitulo={`${tenants.length} ${tenants.length === 1 ? "empresa" : "empresas"}`}
      accionPrincipal={nueva}
      buscador={<Buscador placeholder="Buscar empresa o slug" />}
      filtros={
        <ChipsFiltro
          filtros={[
            {
              param: "estado",
              etiqueta: "Estado",
              opciones: [
                { valor: "activo", etiqueta: "Activo" },
                { valor: "trial", etiqueta: "Trial" },
                { valor: "suspendido", etiqueta: "Suspendido" },
              ],
            },
            {
              param: "vertical",
              etiqueta: "Vertical",
              opciones: verticales.map((v) => ({ valor: v, etiqueta: nombreVertical(v) })),
            },
          ]}
        />
      }
      textos={{
        vacio: {
          titulo: "Sin empresas",
          descripcion: "Crea una o ajusta los filtros.",
          accion: nueva,
        },
      }}
      items={tenants}
      clave={(t) => t.id}
      href={(t) => `/platform/tenants/${t.id}`}
      Link={LinkNext}
      tarjeta={(t) => (
        <>
          <Monograma nombre={t.nombre} className="mt-0.5 size-8 text-xs" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-md font-medium text-fg">{t.nombre}</span>
            <span className="block truncate text-sm text-fg-muted">
              {nombreVertical(t.vertical)} · {t.usuarios}{" "}
              {t.usuarios === 1 ? "usuario" : "usuarios"} · IA {usd(t.iaMesUsd)}
            </span>
          </span>
          <EstadoTenant estado={t.estado} />
        </>
      )}
      columnas={[
        {
          id: "empresa",
          etiqueta: "Empresa",
          render: (t) => (
            <span className="flex items-center gap-2.5">
              <Monograma nombre={t.nombre} className="size-7 text-[10px]" />
              <span className="flex flex-col">
                <span className="font-medium">{t.nombre}</span>
                <span className="t-mono text-sm text-fg-muted">{t.slug}</span>
              </span>
            </span>
          ),
        },
        { id: "vertical", etiqueta: "Vertical", render: (t) => nombreVertical(t.vertical) },
        { id: "estado", etiqueta: "Estado", render: (t) => <EstadoTenant estado={t.estado} /> },
        { id: "modulos", etiqueta: "Módulos", className: num, render: modulos },
        { id: "usuarios", etiqueta: "Usuarios", className: num, render: (t) => t.usuarios },
        { id: "ia", etiqueta: "IA del mes", className: num, render: (t) => usd(t.iaMesUsd) },
        {
          id: "acceso",
          etiqueta: "Último acceso",
          render: (t) => (t.ultimoAcceso ? haceCuanto(t.ultimoAcceso) : "—"),
        },
      ]}
    />
  );
}
