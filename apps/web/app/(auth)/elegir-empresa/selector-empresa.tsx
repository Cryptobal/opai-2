"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { signOut } from "@opai/auth/client";
import { AuthCard, Badge, Button, Monograma } from "@opai/ds";

import { cambiarTenant } from "@/app/_acciones/capacidad";
import { LinkNext } from "@/app/_components/link-next";
import { ETIQUETA_ROL } from "@/app/_components/portales";
import { fechaCorta } from "@/lib/formato";

type Empresa = { tenantId: string; nombre: string; rol: string; ultimoAcceso: string | null };

/** Tarjetas de empresa con monograma, rol y último acceso; cerrar sesión al pie. */
export function SelectorEmpresa({ empresas, destino }: { empresas: Empresa[]; destino: string }) {
  const router = useRouter();
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
        <Button
          variant="ghost"
          size="lg"
          onClick={() => void signOut().then(() => router.push("/login"))}
        >
          Cerrar sesión
        </Button>
      }
    >
      <ul className="flex flex-col gap-2">
        {empresas.map((e) => (
          <li key={e.tenantId}>
            <button
              type="button"
              onClick={() => void cambiarTenant(e.tenantId, destino)}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-4 text-left hover:bg-fill"
            >
              <Monograma nombre={e.nombre} className="size-10 rounded-md text-sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-md font-medium text-fg">{e.nombre}</span>
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
              </span>
              <ChevronRight className="size-5 flex-none text-fg-subtle" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </AuthCard>
  );
}
