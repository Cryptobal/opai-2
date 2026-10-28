import { datosShell } from "@/app/_components/datos-shell";
import { identidadActual } from "@/lib/servidor";

import { AreaPrincipalDiferida } from "./area-principal-diferida";

export async function AreaPrincipalServidor() {
  const identidad = await identidadActual();
  if (!identidad) return null;
  return <AreaPrincipalDiferida grupos={datosShell(identidad, "erp").grupos ?? []} />;
}
