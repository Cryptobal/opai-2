import { Suspense } from "react";

import { Loading } from "@opai/ds";

import { dispositivoActual } from "@/lib/dispositivo";

import { PantallaEmparejar } from "./pantalla-emparejar";

export const metadata = { title: "Emparejar este dispositivo" };

type Props = { searchParams: Promise<{ c?: string; listo?: string }> };

async function Contenido({ searchParams }: Props) {
  const { c, listo } = await searchParams;
  const d = await dispositivoActual();
  const estado = d?.estado === "revocado" ? "revocado" : listo && d ? "listo" : "codigo";
  return (
    <PantallaEmparejar
      estado={estado}
      identificador={d?.identificador ?? null}
      codigoInicial={(c ?? "").slice(0, 6)}
    />
  );
}

/** Terreno › Emparejar (export-terreno/Emparejar): código de 6 caracteres, emparejado o revocado. */
export default function Pagina(props: Props) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
