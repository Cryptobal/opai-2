import { headers } from "next/headers";
import { Suspense } from "react";

import { googleHabilitado } from "@opai/auth";
import { Loading } from "@opai/ds";

import { esAppNativa } from "@/lib/app-nativa";
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
  // Google bloquea su ingreso en las vistas web de las apps («disallowed_useragent»): dentro de la app
  // nativa no se ofrece (CAR-515).
  const enApp = esAppNativa((await headers()).get("user-agent") ?? "");
  return (
    <FormularioLogin
      destino={oauth ?? (next === undefined ? "" : destinoSeguro(next))}
      google={googleHabilitado() && !enApp}
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
