"use client";

import dynamic from "next/dynamic";
import { SeccionTarjeta, Skeleton } from "@opai/ds";
import type { GrupoArea } from "@/lib/navegacion-areas";

// El editor está después de las preferencias generales, fuera del primer viewport del teléfono.
const Editor = dynamic(() => import("./area-principal").then((m) => m.AreaPrincipal), {
  ssr: false,
  loading: () => <SeccionTarjeta titulo="Área principal"><Skeleton className="h-40" /></SeccionTarjeta>,
});

export function AreaPrincipalDiferida({ grupos }: { grupos: GrupoArea[] }) {
  return <Editor grupos={grupos} />;
}
