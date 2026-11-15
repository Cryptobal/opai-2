import { Suspense } from "react";

import { urlReanudarOAuth } from "@opai/auth";
import { Loading } from "@opai/ds";

import { requerirIdentidad } from "@/lib/servidor";

import { consultaDe, RUTA_CONTINUAR_OAUTH } from "../../oauth-consulta";
import { exigirSegundoFactor } from "../mfa-previo";
import { AutorizacionVencida } from "../vencido";
import { Reanudar } from "./reanudar";

export const metadata = { title: "Conectando" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Contenido({ searchParams }: Props) {
  const consulta = consultaDe(await searchParams);
  const ruta = `${RUTA_CONTINUAR_OAUTH}?${consulta}`;
  await exigirSegundoFactor(await requerirIdentidad(ruta), ruta);
  const url = await urlReanudarOAuth(consulta);
  return url ? <Reanudar url={url} /> : <AutorizacionVencida />;
}

/** Tras entrar (y el segundo factor), vuelve a la autorización que pidió la app (CAR-247). */
export default function Continuar(props: Props) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
