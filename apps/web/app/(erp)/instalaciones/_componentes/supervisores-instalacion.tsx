import { SeccionTarjeta, Skeleton } from "@opai/ds";
import { Suspense } from "react";

import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import type { SupervisoresDeInstalacion } from "./supervisores-a-cargo";
import { SupervisoresACargoDiferido } from "./supervisores-a-cargo-diferido";

/** Carga los supervisores de la instalación; sin permiso para leer usuarios, la sección no aparece. */
async function Seccion({ instalacionId }: { instalacionId: string }) {
  const [r, identidad] = await Promise.all([
    ejecutarComoUsuario<SupervisoresDeInstalacion>("erp", "core.supervisores.de_instalacion", {
      instalacionId,
    }),
    identidadActual(),
  ]);
  if (!r.ok) return null;
  const rol = identidad?.actual?.rol;
  return <SupervisoresACargoDiferido datos={r.data} puedeGestionar={rol === "owner" || rol === "admin"} />;
}

/**
 * Supervisores a cargo de la instalación (CAR-38, Brief 07c bloque 9) en el Resumen. Va en su
 * propio Suspense: el resto de la ficha no espera esta consulta y el skeleton tiene su forma.
 */
export function SupervisoresInstalacion({ instalacionId }: { instalacionId: string }) {
  return (
    <Suspense
      fallback={
        <SeccionTarjeta titulo="Supervisores a cargo">
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-1/2" />
          </div>
        </SeccionTarjeta>
      }
    >
      <Seccion instalacionId={instalacionId} />
    </Suspense>
  );
}
