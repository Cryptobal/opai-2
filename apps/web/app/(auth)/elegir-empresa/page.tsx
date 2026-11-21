import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Loading } from "@opai/ds";

import { epocaDeIdentidad } from "@/lib/epoca-sesion";
import { requerirIdentidad } from "@/lib/servidor";
import { empresasParaSelector } from "@/lib/empresas-selector";
import { membresiasUsables } from "@/lib/tenant-actual";
import { destinoDeInicio } from "@/lib/portal-inicio";

import { destinoSeguro } from "../destino";
import { esContinuarOAuth } from "../oauth-consulta";
import { SelectorEmpresa } from "./selector-empresa";

export const metadata = { title: "Elige una empresa" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Contenido({ searchParams }: Props) {
  const { next } = await searchParams;
  const destino = next === undefined ? "" : destinoSeguro(next);
  const identidad = await requerirIdentidad("/elegir-empresa");
  // Si se viene de autorizar una app, la empresa se elige dentro de ese flujo (CAR-247).
  if (esContinuarOAuth(destino)) redirect(destino);
  const usables = membresiasUsables(identidad.membresias);
  // Con una sola empresa (o ninguna) no hay nada que elegir.
  if (usables.length <= 1) redirect(destinoDeInicio(identidad, destino));
  const empresas = await empresasParaSelector(identidad.usuario.id, identidad.membresias);
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
