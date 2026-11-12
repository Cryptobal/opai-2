"use client";

import { useState } from "react";

import { Alerta, AuthCard, Badge, Button, FilaSeleccionable, Monograma } from "@opai/ds";

import { accionSalir } from "@/app/_acciones/auth";
import { accionElegirEmpresaOAuth } from "@/app/_acciones/oauth";
import { cambiarTenant } from "@/app/_acciones/capacidad";
import { trasLimpiarCaches } from "@/app/_components/pwa/limpiar-cache";
import { useEpocaSesion } from "@/app/_components/refresco-navegador";
import { LinkNext } from "@/app/_components/link-next";
import { ETIQUETA_ROL } from "@/app/_components/portales";
import { fechaCorta } from "@/lib/formato";

type Empresa = { tenantId: string; nombre: string; rol: string; ultimoAcceso: string | null };

/** Tarjetas de empresa con monograma, rol y último acceso; cerrar sesión al pie. */
type Props = {
  empresas: Empresa[];
  destino: string;
  epoca?: string;
  /** Consulta firmada cuando una app pide entrar por OAuth (CAR-247): la empresa es la de la app. */
  consultaOAuth?: string | null;
};

export function SelectorEmpresa({ empresas, destino, epoca, consultaOAuth }: Props) {
  useEpocaSesion(epoca ?? null);
  const [fallo, setFallo] = useState(false);
  const elegir = (tenantId: string) => {
    if (!consultaOAuth) return trasLimpiarCaches(() => cambiarTenant(tenantId, destino));
    void accionElegirEmpresaOAuth(tenantId, consultaOAuth).then((r) =>
      r.ok ? window.location.assign(r.url) : setFallo(true),
    );
  };
  return (
    <AuthCard
      Link={LinkNext}
      abierta
      titulo="Elige una empresa"
      subtitulo={
        consultaOAuth ? (
          "Elige con qué empresa entrará la app que estás conectando."
        ) : (
          <>
            Tu cuenta tiene acceso a {empresas.length} empresas.
            <span className="hidden md:inline">
              {" "}
              Puedes cambiar después desde el menú de tu perfil.
            </span>
          </>
        )
      }
      acciones={
        <Button variant="ghost" size="lg" onClick={() => trasLimpiarCaches(accionSalir)}>
          Cerrar sesión
        </Button>
      }
    >
      {fallo ? (
        <Alerta tono="danger" titulo="No pudimos conectar la app" className="mb-4">
          Vuelve a la app y conecta OPAI otra vez.
        </Alerta>
      ) : null}
      <ul className="flex flex-col gap-2">
        {empresas.map((e) => (
          <li key={e.tenantId}>
            <FilaSeleccionable
              onClick={() => elegir(e.tenantId)}
              className="rounded-lg border border-border bg-surface p-4"
              inicio={<Monograma nombre={e.nombre} className="size-10 rounded-md text-sm" />}
              titulo={e.nombre}
              secundario={
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge
                    punto={false}
                    tono={e.rol === "owner" || e.rol === "admin" ? "accent" : "neutro"}
                  >
                    {ETIQUETA_ROL[e.rol] ?? e.rol}
                  </Badge>
                  <span className="text-sm text-fg-muted">
                    {e.ultimoAcceso ? `Último acceso ${fechaCorta(e.ultimoAcceso)}` : "Sin accesos"}
                  </span>
                </span>
              }
            />
          </li>
        ))}
      </ul>
    </AuthCard>
  );
}
