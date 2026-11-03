import type { ReactNode } from "react";

import type { cargarFichaCotizacion } from "./datos";

type Props = {
  datos: ReturnType<typeof cargarFichaCotizacion>;
  children: (d: Awaited<ReturnType<typeof cargarFichaCotizacion>>) => ReactNode;
};

export async function DetalleCotizacion({ datos, children }: Props) {
  const ficha = await datos;
  return children(ficha);
}
