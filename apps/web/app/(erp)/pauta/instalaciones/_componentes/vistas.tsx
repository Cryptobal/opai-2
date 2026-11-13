import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { claveMes } from "../../_componentes/etiquetas";

/** Mensual · Diaria · Por instalación, igual que en la barra de la Pauta; aquí la activa es la última. */
export function VistasPauta({ anio, mes }: { anio: number; mes: number }) {
  const m = claveMes(anio, mes);
  return (
    <nav aria-label="Vistas de pauta" className="flex w-full gap-2">
      <EnlaceBoton variante="secondary" href={`/pauta?mes=${m}`}>
        Mensual
      </EnlaceBoton>
      <EnlaceBoton variante="secondary" href="/pauta?vista=diaria">
        Diaria
      </EnlaceBoton>
      <EnlaceBoton variante="primary" href={`/pauta/instalaciones?mes=${m}`}>
        <span aria-current="page">Por instalación</span>
      </EnlaceBoton>
    </nav>
  );
}
