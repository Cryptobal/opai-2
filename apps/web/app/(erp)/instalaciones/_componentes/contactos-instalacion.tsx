import { SeccionTarjeta, Skeleton } from "@opai/ds";
import { Suspense } from "react";

import { PERMISOS_CORE } from "@opai/domain";

import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { ContactosInstalacionCliente, type ContactosDeInstalacion } from "./contactos-instalacion-cliente";

async function Seccion({ instalacionId }: { instalacionId: string }) {
  const [r, identidad] = await Promise.all([
    ejecutarComoUsuario<ContactosDeInstalacion>("erp", "core.instalacion_contactos.list", {
      instalacionId,
    }),
    identidadActual(),
  ]);
  if (!r.ok) return null;
  const puedeGestionar = identidad ? puedeDeIdentidad(identidad)(PERMISOS_CORE.instalacionesManage) : false;
  return (
    <ContactosInstalacionCliente datos={r.data} puedeGestionar={puedeGestionar} />
  );
}

/** Contactos de la instalación en el Resumen (CAR-608). */
export function ContactosInstalacion({ instalacionId }: { instalacionId: string }) {
  return (
    <Suspense
      fallback={
        <SeccionTarjeta titulo="Contactos">
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-2/3" />
          </div>
        </SeccionTarjeta>
      }
    >
      <Seccion instalacionId={instalacionId} />
    </Suspense>
  );
}