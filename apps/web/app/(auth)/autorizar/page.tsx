import { Suspense } from "react";

import { datosConsentimientoOAuth } from "@opai/auth";
import { Loading } from "@opai/ds";

import { requerirIdentidad } from "@/lib/servidor";
import { membresiasUsables } from "@/lib/tenant-actual";

import { consultaDe } from "../oauth-consulta";
import { alcancesVisibles } from "./alcances";
import { Consentimiento } from "./consentimiento";
import { AutorizacionVencida } from "./vencido";

export const metadata = { title: "Autorizar app" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Contenido({ searchParams }: Props) {
  const consulta = consultaDe(await searchParams);
  const identidad = await requerirIdentidad(`/autorizar?${consulta}`);
  const datos = await datosConsentimientoOAuth(consulta);
  const empresa = membresiasUsables(identidad.membresias).find(
    (m) => m.tenantId === datos?.empresaId,
  );
  if (!datos || !empresa) return <AutorizacionVencida />;
  return (
    <Consentimiento
      app={datos.app.nombre}
      empresa={empresa.tenant.nombre}
      alcances={alcancesVisibles(datos.alcances)}
      consulta={consulta}
    />
  );
}

/** Consentimiento del OAuth del MCP (CAR-247, ADR-098). Lo abre el proveedor con la consulta firmada. */
export default function Autorizar(props: Props) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
