"use client";

import { AuthCard, Badge, Button, FilaSeleccionable, Monograma } from "@opai/ds";

import { accionSalir } from "@/app/_acciones/auth";
import { cambiarTenant } from "@/app/_acciones/capacidad";
import { avisarCambioSesion } from "@/app/_components/refresco-navegador";
import { LinkNext } from "@/app/_components/link-next";
import { ETIQUETA_ROL } from "@/app/_components/portales";
import { fechaCorta } from "@/lib/formato";

type Empresa = { tenantId: string; nombre: string; rol: string; ultimoAcceso: string | null };

/** Tarjetas de empresa con monograma, rol y último acceso; cerrar sesión al pie. */
export function SelectorEmpresa({ empresas, destino }: { empresas: Empresa[]; destino: string }) {
  return (
    <AuthCard
      Link={LinkNext}
      abierta
      titulo="Elige una empresa"
      subtitulo={
        <>
          Tu cuenta tiene acceso a {empresas.length} empresas.
          <span className="hidden md:inline">
            {" "}
            Puedes cambiar después desde el menú de tu perfil.
          </span>
        </>
      }
      acciones={
        <Button variant="ghost" size="lg" onClick={() => void accionSalir()}>
          Cerrar sesión
        </Button>
      }
    >
      <ul className="flex flex-col gap-2">
        {empresas.map((e) => (
          <li key={e.tenantId}>
            <FilaSeleccionable
              onClick={() => {
                avisarCambioSesion();
                void cambiarTenant(e.tenantId, destino);
              }}
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
