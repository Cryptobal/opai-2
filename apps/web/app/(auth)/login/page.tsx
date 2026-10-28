import { Suspense } from "react";

import { googleHabilitado } from "@opai/auth";
import { Loading } from "@opai/ds";

import { epocaDeIdentidad } from "@/lib/epoca-sesion";
import { identidadActual } from "@/lib/servidor";

import { destinoSeguro } from "../destino";
import { FormularioLogin } from "./formulario-login";

export const metadata = { title: "Entrar" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Contenido({ searchParams }: Props) {
  const { next } = await searchParams;
  const epoca = epocaDeIdentidad(await identidadActual());
  return (
    <FormularioLogin
      destino={next === undefined ? "" : destinoSeguro(next)}
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
