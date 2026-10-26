import { type ReactNode, Suspense } from "react";

import { Loading } from "@opai/ds";

import { identidadActual, tieneAccesoAPortal } from "@/lib/servidor";

import { CargaPortal } from "./carga-portal";
import { datosShell } from "./datos-shell";
import { MarcoShell } from "./marco-shell";

/** Resuelve la identidad (lee cookies y sesión: dato dinámico) y monta el shell persistente. Vive
 *  dentro de un Suspense para que el acceso dinámico no bloquee el prerender del documento. */
async function ShellResuelto({ portal, children }: { portal: string; children: ReactNode }) {
  const identidad = await identidadActual();
  // Sin sesión no se monta shell: la página redirige a `/login` con el `next` correcto.
  if (!identidad || !tieneAccesoAPortal(identidad, portal)) return children;
  return (
    <MarcoShell datos={datosShell(identidad, portal)}>
      <CargaPortal>{children}</CargaPortal>
    </MarcoShell>
  );
}

/**
 * Layout de un portal (ADR-045): monta el shell persistente —navegación, portales, campana, ⌘K y
 * menú de usuario— una sola vez, con el contenido del portal dentro de su propio Suspense. Al navegar
 * entre páginas del portal, Next no vuelve a ejecutar este layout, así que el shell no se re-monta:
 * solo se reemplaza el contenido. El `Suspense` exterior mantiene el documento prerenderizable pese a
 * que el shell depende de la sesión (cookies); su esqueleto es diferido (no parpadea en cargas rápidas).
 */
export function PortalLayout({ portal, children }: { portal: string; children: ReactNode }) {
  return (
    <Suspense fallback={<Loading diferido variante="lista" className="p-4 md:p-6" />}>
      <ShellResuelto portal={portal}>{children}</ShellResuelto>
    </Suspense>
  );
}
