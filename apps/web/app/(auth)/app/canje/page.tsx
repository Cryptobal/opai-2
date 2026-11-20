import { Suspense } from "react";

import { Loading } from "@opai/ds";

import { CanjeApp } from "./canje-app";

export const metadata = { title: "Entrando" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Contenido({ searchParams }: Props) {
  const { codigo } = await searchParams;
  return <CanjeApp codigo={typeof codigo === "string" ? codigo : ""} />;
}

/**
 * Ingreso con Google desde la app nativa (CAR-516, Brief 17b), paso 3, dentro de la app: la vista web
 * llega aquí desde el enlace `cl.opai.app://canje` y canjea el código con su verificador.
 */
export default function Canje(props: Props) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
