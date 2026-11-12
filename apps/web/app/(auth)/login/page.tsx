import { Suspense } from "react";

import { googleHabilitado } from "@opai/auth";
import { Loading } from "@opai/ds";

import { epocaDeIdentidad } from "@/lib/epoca-sesion";
import { identidadActual } from "@/lib/servidor";

import { destinoSeguro } from "../destino";
import { destinoContinuarOAuth } from "../oauth-consulta";
import { FormularioLogin } from "./formulario-login";

export const metadata = { title: "Entrar" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Contenido({ searchParams }: Props) {
  const params = await searchParams;
  const { next } = params;
  // Una app (por ejemplo Claude) pide entrar por OAuth: tras entrar se reanuda su autorización.
  const oauth = destinoContinuarOAuth(params);
  const epoca = epocaDeIdentidad(await identidadActual());
  return (
    <FormularioLogin
      destino={oauth ?? (next === undefined ? "" : destinoSeguro(next))}
      google={googleHabilitado()}
      epoca={epoca}
    />
  );
}

export default function Login(props: Props) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
