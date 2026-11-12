import { Suspense } from "react";

import { consultaOAuthValida } from "@opai/auth";
import { Loading } from "@opai/ds";

import { epocaDeIdentidad } from "@/lib/epoca-sesion";
import { requerirIdentidad } from "@/lib/servidor";
import { membresiasUsables } from "@/lib/tenant-actual";
import { ultimosAccesos } from "@/lib/ultimo-acceso";

import { SelectorEmpresa } from "../../elegir-empresa/selector-empresa";
import { consultaDe } from "../../oauth-consulta";
import { exigirSegundoFactor } from "../mfa-previo";
import { AutorizacionVencida } from "../vencido";

export const metadata = { title: "Elige una empresa" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Contenido({ searchParams }: Props) {
  const consulta = consultaDe(await searchParams);
  const ruta = `/autorizar/empresa?${consulta}`;
  const identidad = await requerirIdentidad(ruta);
  await exigirSegundoFactor(identidad, ruta);
  if (!(await consultaOAuthValida(consulta))) return <AutorizacionVencida />;
  const usables = membresiasUsables(identidad.membresias);
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
      destino=""
      epoca={epocaDeIdentidad(identidad)}
      consultaOAuth={consulta}
    />
  );
}

/** Empresa con la que entra la app que se está conectando por OAuth (CAR-247, export-acceso 05). */
export default function EmpresaOAuth(props: Props) {
  return (
    <Suspense fallback={<Loading variante="lista" className="p-4" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
