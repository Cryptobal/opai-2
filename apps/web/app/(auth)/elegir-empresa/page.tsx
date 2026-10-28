import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Loading } from "@opai/ds";

import { epocaDeIdentidad } from "@/lib/epoca-sesion";
import { requerirIdentidad } from "@/lib/servidor";
import { membresiasUsables } from "@/lib/tenant-actual";
import { ultimosAccesos } from "@/lib/ultimo-acceso";
import { destinoDeInicio } from "@/lib/portal-inicio";

import { destinoSeguro } from "../destino";
import { SelectorEmpresa } from "./selector-empresa";

export const metadata = { title: "Elige una empresa" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Contenido({ searchParams }: Props) {
  const { next } = await searchParams;
  const destino = next === undefined ? "" : destinoSeguro(next);
  const identidad = await requerirIdentidad("/elegir-empresa");
  const usables = membresiasUsables(identidad.membresias);
  // Con una sola empresa (o ninguna) no hay nada que elegir.
  if (usables.length <= 1) redirect(destinoDeInicio(identidad, destino));
  const accesos = await ultimosAccesos(
    identidad.usuario.id,
    usables.map((m) => m.tenantId),
  );
  const empresas = usables.map((m) => ({
    tenantId: m.tenantId,
    nombre: m.tenant.nombre,
    rol: m.rol,
    ultimoAcceso: accesos.get(m.tenantId)?.toISOString() ?? null,
  }));
  return (
    <SelectorEmpresa empresas={empresas} destino={destino} epoca={epocaDeIdentidad(identidad)} />
  );
}

/** Selector de empresa tras el login (export-acceso 05). */
export default function ElegirEmpresa(props: Props) {
  return (
    <Suspense fallback={<Loading variante="lista" className="p-4" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
