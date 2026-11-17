import Link from "next/link";

import { Button, Estado } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
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
      {(d) => (
        <Estado state={estadoPantalla(d.r)} variante="detalle">
          {d.r.ok ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="t-title">{d.r.data.personaNombre}</h1>
                <Button variant="secondary" asChild>
                  <Link href="/remuneraciones/cumplimiento-dt/finiquitos">Volver a finiquitos</Link>
                </Button>
              </div>
              <FiniquitoDetalle datos={d.r.data} />
            </div>
          ) : null}
        </Estado>
      )}
    </PaginaPortal>
  );
}