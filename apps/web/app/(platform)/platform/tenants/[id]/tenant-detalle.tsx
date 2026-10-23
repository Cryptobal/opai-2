"use client";

import { vocabulario } from "@opai/domain";
import { DetailScreen, type EstadoPantalla } from "@opai/ds";

import { badgeEstado } from "../../tenants-lista";
import { ApiKeysTenant } from "./tenant-keys";
import { ResumenTenant } from "./tenant-resumen";
import { Administradores, Modulos } from "./tenant-tabs";

export type DetalleTenant = {
  tenant: {
    id: string;
    slug: string;
    nombre: string;
    vertical: string;
    timezone: string;
    estado: string;
  };
  modulos: { id: string; nombre: string; dependencias: string[]; estado: string | null }[];
  administradores: {
    membershipId: string;
    nombre: string;
    email: string;
    rol: string;
    estado: string;
  }[];
  invitaciones: { id: string; email: string; rol: string; estado: string }[];
  apiKeys: {
    id: string;
    nombre: string;
    prefijo: string;
    scopes: string[];
    ultimoUsoEn: string | null;
    revocadaEn: string | null;
  }[];
  uso: { total: number; errores: number; porModulo: { modulo: string; total: number }[] };
};

/** Plataforma → detalle de empresa: Resumen, Módulos, Administradores y API keys. */
export function TenantDetalle({
  state,
  detalle,
}: {
  state: EstadoPantalla;
  detalle: DetalleTenant | null;
}) {
  if (!detalle)
    return <DetailScreen state={state === "ready" ? "error" : state} titulo="Empresa" />;
  const { tenant } = detalle;
  return (
    <DetailScreen
      state={state}
      titulo={tenant.nombre}
      subtitulo={`${tenant.slug} · ${vocabulario(tenant.vertical).vertical}`}
      estado={badgeEstado(tenant.estado)}
      tabs={[
        { id: "resumen", etiqueta: "Resumen", contenido: <ResumenTenant detalle={detalle} /> },
        {
          id: "modulos",
          etiqueta: "Módulos",
          contenido: <Modulos detalle={detalle} />,
          contador: detalle.modulos.length,
        },
        {
          id: "admins",
          etiqueta: "Administradores",
          contenido: <Administradores detalle={detalle} />,
          contador: detalle.administradores.length,
        },
        {
          id: "keys",
          etiqueta: "API keys",
          contenido: <ApiKeysTenant detalle={detalle} />,
          contador: detalle.apiKeys.length,
        },
      ]}
    />
  );
}
