import { datosShell } from "@/app/_components/datos-shell";
import { identidadActual } from "@/lib/servidor";

import { AreaPrincipal } from "./area-principal";

export async function AreaPrincipalServidor() {
  const identidad = await identidadActual();
  if (!identidad) return null;
  return <AreaPrincipal grupos={datosShell(identidad, "erp").grupos ?? []} />;
}
