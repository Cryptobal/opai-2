import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Variante } from "./variantes";

export const metadata = { title: "Diseño · Acceso" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Contenido({ searchParams }: Props) {
  const { v } = await searchParams;
  return <Variante id={typeof v === "string" ? v : ""} />;
}

/** Pantallas de acceso con datos ficticios (`?v=login-error`; el tema sigue al sistema). Solo fuera de producción. */
export default function PaginaAcceso(props: Props) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <Contenido {...props} />
    </Suspense>
  );
}
