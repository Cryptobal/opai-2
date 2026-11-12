import { Suspense } from "react";

import { getSession } from "@opai/auth";
import { Loading } from "@opai/ds";

import { destinoSeguro } from "../destino";
import { FormularioVerificar } from "./formulario-verificar";

export const metadata = { title: "Verificar" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Paso de verificación del segundo factor en el login (NÚCLEO-F). Se llega tras validar la contraseña
 * cuando la cuenta tiene el segundo factor activo; el desafío viaja en la cookie `opai.*` que fijó el
 * plugin. No requiere sesión todavía: la sesión se crea al verificar el código. Una passkey también
 * completa el paso (CAR-286); si la cuenta solo tiene passkeys, es la única opción.
 */
async function Contenido({ searchParams }: Props) {
  const { next } = await searchParams;
  // Con la sesión ya creada (Google o contraseña) y solo passkeys, no hay código que pedir (CAR-286).
  const s = await getSession();
  const soloPasskey = Boolean(s && !s.user.twoFactorEnabled && s.user.passkeyEnabled);
  return (
    <FormularioVerificar destino={next ? destinoSeguro(next) : ""} soloPasskey={soloPasskey} />
  );
}

export default function VerificarMfa(props: Props) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
