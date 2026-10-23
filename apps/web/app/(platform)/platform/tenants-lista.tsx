"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { vocabulario } from "@opai/domain";
import { Badge, Button, type EstadoPantalla, ListScreen, Monograma } from "@opai/ds";

export type TenantFila = {
  id: string;
  slug: string;
  nombre: string;
  vertical: string;
  estado: string;
  modulosActivos: number;
  usuarios: number;
};

const TONO = { activo: "success", trial: "info", suspendido: "danger" } as const;
export const badgeEstado = (estado: string) => (
  <Badge tono={TONO[estado as keyof typeof TONO] ?? "neutro"}>{estado}</Badge>
);

/** Plataforma → Empresas: todas las empresas con vertical, estado, módulos y usuarios. */
export function TenantsLista({ state, tenants }: { state: EstadoPantalla; tenants: TenantFila[] }) {
  const router = useRouter();
  return (
    <ListScreen
      state={state}
      titulo="Empresas"
      subtitulo={`${tenants.length} en OPAI`}
      accionPrincipal={
        <Button onClick={() => router.push("/platform/tenants/nuevo")}>
          <Plus className="size-4" /> Nueva empresa
        </Button>
      }
      textos={{
        vacio: { titulo: "Aún no hay empresas", descripcion: "Crea la primera con Nueva empresa." },
      }}
      items={tenants}
      clave={(t) => t.id}
      onSeleccionar={(t) => router.push(`/platform/tenants/${t.id}`)}
      tarjeta={(t) => (
        <>
          <Monograma nombre={t.nombre} className="mt-0.5 size-8 text-xs" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-md font-medium text-fg">{t.nombre}</span>
            <span className="block truncate text-base text-fg-muted">
              {vocabulario(t.vertical).vertical} · {t.usuarios} usuarios · {t.modulosActivos}{" "}
              módulos
            </span>
          </span>
          {badgeEstado(t.estado)}
        </>
      )}
      columnas={[
        {
          id: "nombre",
          etiqueta: "Empresa",
          render: (t) => <span className="font-medium">{t.nombre}</span>,
        },
        { id: "slug", etiqueta: "Slug", render: (t) => <span className="t-mono">{t.slug}</span> },
        { id: "vertical", etiqueta: "Vertical", render: (t) => vocabulario(t.vertical).vertical },
        { id: "estado", etiqueta: "Estado", render: (t) => badgeEstado(t.estado) },
        {
          id: "modulos",
          etiqueta: "Módulos",
          render: (t) => t.modulosActivos,
          className: "text-right t-numeric",
        },
        {
          id: "usuarios",
          etiqueta: "Usuarios",
          render: (t) => t.usuarios,
          className: "text-right t-numeric",
        },
      ]}
    />
  );
}
