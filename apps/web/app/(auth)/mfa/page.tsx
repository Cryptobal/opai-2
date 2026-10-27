import { Suspense } from "react";

import { Loading } from "@opai/ds";

import { destinoSeguro } from "../destino";
import { FormularioVerificar } from "./formulario-verificar";

export const metadata = { title: "Verificar" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Paso de verificación del segundo factor en el login (NÚCLEO-F). Se llega tras validar la contraseña
 * cuando la cuenta tiene el segundo factor activo; el desafío viaja en la cookie `opai.*` que fijó el
 * plugin. No requiere sesión todavía: la sesión se crea al verificar el código.
 */
async function Contenido({ searchParams }: Props) {
  const { next } = await searchParams;
  return <FormularioVerificar destino={destinoSeguro(next)} />;
}

export default function VerificarMfa(props: Props) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
