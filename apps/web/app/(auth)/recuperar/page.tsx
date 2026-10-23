import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Loading } from "@opai/ds";

import { EnlaceVencido } from "./enlace-vencido";
import { PedirEnlace } from "./pedir-enlace";

export const metadata = { title: "Recuperar contraseña" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Contenido({ searchParams }: Props) {
  const { token, error } = await searchParams;
  // Better Auth vuelve del enlace con ?token=… (o ?error=INVALID_TOKEN).
  if (typeof token === "string" && token) redirect(`/recuperar/${encodeURIComponent(token)}`);
  if (typeof error === "string") return <EnlaceVencido />;
  return <PedirEnlace />;
}

/** Recuperar contraseña: pedir enlace (export-acceso 03). */
export default function Recuperar(props: Props) {
  return (
    <Suspense fallback={<Loading variante="formulario" className="p-4" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
