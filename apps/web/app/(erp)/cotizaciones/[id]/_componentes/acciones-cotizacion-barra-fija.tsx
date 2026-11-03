import type { ReactNode } from "react";

import type { BloqueoEnvioCpq } from "./acciones-cotizacion-logica";

/** Contenido de la barra fija móvil: sin repetir el aviso de sueldo (queda en la línea del puesto). */
export function AccionesCotizacionBarraFija({
  bloqueoCalculo,
  bloqueoMutual,
  avisoBloqueo,
  botonPrimaria,
}: {
  bloqueoCalculo: BloqueoEnvioCpq | null;
  bloqueoMutual: BloqueoEnvioCpq | null;
  avisoBloqueo: (b: BloqueoEnvioCpq) => ReactNode;
  botonPrimaria: (clase?: string) => ReactNode;
}) {
  if (bloqueoCalculo) return avisoBloqueo(bloqueoCalculo);
  if (bloqueoMutual) {
    return (
      <div className="flex w-full flex-col gap-2">
        {avisoBloqueo(bloqueoMutual)}
        {botonPrimaria("w-full")}
      </div>
    );
  }
  return botonPrimaria("w-full");
}
