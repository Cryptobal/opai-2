import { Suspense } from "react";

import { getSession } from "@opai/auth";
import { Loading } from "@opai/ds";

import { verInvitacion } from "./acciones";
import { Invitacion, InvitacionInvalida } from "./invitacion";

export const metadata = { title: "Invitación" };

type Props = { params: Promise<{ slug: string; token: string }> };

async function Contenido({ params }: Props) {
  const { slug, token } = await params;
  const [vista, sesion] = await Promise.all([verInvitacion(slug, token), getSession()]);
  if (!vista?.ok) return <InvitacionInvalida />;
  const datos = vista.data as {
    tenant: string;
    email: string;
    rol: string;
    estado: string;
    usuarioExiste: boolean;
  };
  return <Invitacion slug={slug} token={token} datos={datos} sesion={sesion?.user.email ?? null} />;
}

/** Invitación: muestra empresa y rol; crea la cuenta o pide iniciar sesión; acepta. */
export default function PaginaInvitacion(props: Props) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
