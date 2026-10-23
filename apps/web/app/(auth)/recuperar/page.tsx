import { Suspense } from "react";

import { Loading } from "@opai/ds";

import { NuevaPassword, PedirEnlace } from "./formularios";

export const metadata = { title: "Recuperar contraseña" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Contenido({ searchParams }: Props) {
  const { token, error } = await searchParams;
  if (typeof token === "string" && token) return <NuevaPassword token={token} />;
  return <PedirEnlace enlaceInvalido={typeof error === "string"} />;
}

/** Recuperación por enlace: pedir el correo o, desde el enlace, fijar la contraseña nueva. */
export default function Recuperar(props: Props) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
