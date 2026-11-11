import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Loading } from "@opai/ds";

import { epocaDeIdentidad } from "@/lib/epoca-sesion";
import { requerirIdentidad } from "@/lib/servidor";
import { membresiasUsables } from "@/lib/tenant-actual";
import { ultimosAccesos } from "@/lib/ultimo-acceso";
import { destinoDeInicio } from "@/lib/portal-inicio";

import { destinoSeguro } from "../destino";
import { consultaDe, esContinuarOAuth } from "../oauth-consulta";
import { SelectorEmpresa } from "./selector-empresa";

export const metadata = { title: "Elige una empresa" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Contenido({ searchParams }: Props) {
  const params = await searchParams;
  const { next, oauth } = params;
  const destino = next === undefined ? "" : destinoSeguro(next);
  const identidad = await requerirIdentidad("/elegir-empresa");
  // Si se viene de autorizar una app, la empresa se elige dentro de ese flujo (CAR-247).
  if (esContinuarOAuth(destino)) redirect(destino);
  const usables = membresiasUsables(identidad.membresias);
  const consultaOAuth = oauth === "1" ? consultaDe(params, ["oauth"]) : null;
  // Con una sola empresa (o ninguna) no hay nada que elegir.
  if (usables.length <= 1 && !consultaOAuth) redirect(destinoDeInicio(identidad, destino));
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
    <SelectorEmpresa
      empresas={empresas}
      destino={destino}
      epoca={epocaDeIdentidad(identidad)}
      consultaOAuth={consultaOAuth}
    />
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
