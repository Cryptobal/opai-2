import { dispositivoActual } from "@/lib/dispositivo";

import { PantallaEmparejar } from "./pantalla-emparejar";

export const metadata = { title: "Emparejar este dispositivo" };

/** Terreno › Emparejar (export-terreno/Emparejar): código de 6 caracteres, emparejado o revocado. */
export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; listo?: string }>;
}) {
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
