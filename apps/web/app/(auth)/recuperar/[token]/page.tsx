import { Suspense } from "react";

import { correoDeRecuperacion } from "@opai/auth";
import { Loading } from "@opai/ds";

import { EnlaceVencido } from "../enlace-vencido";
import { NuevaPassword } from "./nueva-password";

export const metadata = { title: "Nueva contraseña" };

type Props = { params: Promise<{ token: string }> };

async function Contenido({ params }: Props) {
  const { token } = await params;
  const correo = await correoDeRecuperacion(decodeURIComponent(token));
  return correo ? (
    <NuevaPassword token={decodeURIComponent(token)} correo={correo} />
  ) : (
    <EnlaceVencido />
  );
}

/** Nueva contraseña desde el enlace (export-acceso 03). */
export default function Pagina(props: Props) {
  return (
    <Suspense fallback={<Loading variante="formulario" className="p-4" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
