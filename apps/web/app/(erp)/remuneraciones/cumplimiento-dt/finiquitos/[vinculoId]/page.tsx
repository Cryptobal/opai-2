import { Estado } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla, textosComplementoInactivo } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { FiniquitoDetalle, type DatosFiniquito } from "../../../_componentes/finiquito-detalle";

export const metadata = { title: "Finiquito · Cumplimiento DT" };

/** Ficha de propuesta de finiquito (diseño 08, CAR-99). */
export default function FiniquitoVinculo({ params }: { params: Promise<{ vinculoId: string }> }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Finiquito"
      ruta="/remuneraciones/cumplimiento-dt/finiquitos"
      cargar={async () => {
        const { vinculoId } = await params;
        const r = await ejecutarComoUsuario<DatosFiniquito>("erp", "nomina.finiquito.obtener", { vinculoId });
        return { r, vinculoId };
      }}
    >
      {(d) => {
        const textos = textosComplementoInactivo(d.r);
        return (
        <Estado state={estadoPantalla(d.r)} variante="detalle" {...(textos ? { textos } : {})}>
          {d.r.ok ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="t-title">{d.r.data.personaNombre}</h1>
                <EnlaceBoton href="/remuneraciones/cumplimiento-dt/finiquitos" variante="secondary">
                  Volver a finiquitos
                </EnlaceBoton>
              </div>
              <FiniquitoDetalle datos={d.r.data} />
            </div>
          ) : null}
        </Estado>
        );
      }}
    </PaginaPortal>
  );
}