import { Suspense } from "react";

import { googleHabilitado } from "@opai/auth";
import { Loading } from "@opai/ds";

import { destinoSeguro } from "../destino";
import { FormularioLogin } from "./formulario-login";

export const metadata = { title: "Entrar" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Contenido({ searchParams }: Props) {
  const { next } = await searchParams;
  return <FormularioLogin destino={destinoSeguro(next)} google={googleHabilitado()} />;
}

export default function Login(props: Props) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
