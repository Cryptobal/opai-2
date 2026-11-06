import { Suspense } from "react";

import { Loading } from "@opai/ds";

import { destinoSeguro } from "../../destino";
import { FormularioPin } from "./formulario-pin";

export const metadata = { title: "Trabajador" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** `?next=` lleva a la ruta del portal a la que se quería entrar; se lee dentro de Suspense (Cache Components). */
async function Contenido({ searchParams }: Props) {
  const { next } = await searchParams;
  return <FormularioPin destino={next === undefined ? "" : destinoSeguro(next)} />;
}

export default function LoginTrabajador(props: Props) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
