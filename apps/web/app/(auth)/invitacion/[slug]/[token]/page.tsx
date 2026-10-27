import { Suspense } from "react";

import { getSession } from "@opai/auth";
import { Loading } from "@opai/ds";

import { verInvitacion } from "./acciones";
import { type DatosInvitacion, Invitacion } from "./invitacion";
import { InvitacionInvalida, InvitacionLimitada } from "./invitacion-estados";

export const metadata = { title: "Invitación" };

type Props = { params: Promise<{ slug: string; token: string }> };

async function Contenido({ params }: Props) {
  const { slug, token } = await params;
  const [vista, sesion] = await Promise.all([verInvitacion(slug, token), getSession()]);
  // El tope temporal se muestra aparte (advertencia + reintentar), no como «no encontramos el enlace».
  if (vista && "limitada" in vista) return <InvitacionLimitada />;
  if (!vista?.ok) return <InvitacionInvalida />;
  const sesionActual = sesion ? { nombre: sesion.user.name, email: sesion.user.email } : null;
  return (
    <Invitacion
      slug={slug}
      token={token}
      datos={vista.data as DatosInvitacion}
      sesion={sesionActual}
    />
  );
}

/** Invitación: muestra empresa y rol; crea la cuenta o pide iniciar sesión; acepta. */
export default function PaginaInvitacion(props: Props) {
  return (
    <Suspense fallback={<Loading variante="formulario" className="p-4" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
