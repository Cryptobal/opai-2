import { cookies } from "next/headers";
import { type ReactNode, Suspense } from "react";

import { Loading } from "@opai/ds";

import { identidadActual } from "@/lib/servidor";
import { epocaDe } from "@/lib/epoca-sesion";
import { COOKIE_MARCO, marcoDeCookie, portalAdmiteHilo } from "@/lib/marco";

import { CargaPortal } from "./carga-portal";
import { datosShell } from "./datos-shell";
import { MarcoPortal } from "./marco-portal";

/** Resuelve la identidad (lee cookies y sesión: dato dinámico) y monta el shell persistente. Vive
 *  dentro de un Suspense para que el acceso dinámico no bloquee el prerender del documento. */
async function ShellResuelto({ portal, children }: { portal: string; children: ReactNode }) {
  const identidad = await identidadActual();
  // Sin sesión no se monta shell: la página redirige a `/login` con el `next` correcto. Con sesión
  // pero sin acceso al portal, el shell se monta igual —con la navegación vacía (`datos-shell.ts`)—
  // para que el aviso «Sin permisos» viva dentro del marco, con el selector de portal y empresa y el
  // menú de usuario (Salir). El acceso se sigue verificando en servidor en la página (`servidor.ts`).
  if (!identidad) return children;
  const datos = datosShell(identidad, portal);
  // Marco elegido por la persona (ADR-090): se lee de la cookie de este navegador, sin consultas, así
  // que el servidor ya pinta el marco correcto y no hay parpadeo. Sin acceso a la empresa o fuera del
  // ERP queda el clásico —donde vive el aviso «Sin permisos»— y la cookie ni se lee.
  const hilo =
    portalAdmiteHilo(portal, datos.acceso && datos.tenant !== null) &&
    marcoDeCookie((await cookies()).get(COOKIE_MARCO)?.value) === "hilo";
  return (
    <MarcoPortal
      key={epocaDe(identidad.usuario.id, identidad.actual?.tenantId ?? null)}
      hilo={hilo}
      datos={datos}
    >
      <CargaPortal>{children}</CargaPortal>
    </MarcoPortal>
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
