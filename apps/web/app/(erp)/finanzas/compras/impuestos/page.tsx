import { Estado } from "@opai/ds";

import { SelectorMes } from "@/app/(erp)/configuracion/consumos/_componentes/selector-mes";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import { PestanasCompras } from "../../_componentes/pestanas-compras";
import { cargarF29 } from "./_componentes/datos";
import { VistaF29 } from "./_componentes/vista-f29";

export const metadata = { title: "IVA y F29" };

/**
 * Borrador del F29 del mes (CAR-173): IVA débito y crédito, PPM y fecha de pago. Sin diseño propio aprobado: usa el
 * marco de KPIs y secciones de Hilo, como Consumos; vive como pestaña de Compras porque el menú de Finanzas ya
 * tiene 7 entradas (decisión nocturna, revisar).
 */
export default function ImpuestosPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Compras"
      ruta="/finanzas/compras/impuestos"
      cargando="detalle"
      cargar={async () => cargarF29((await leerParametros(searchParams))["mes"])}
      opciones={(d) => ({ acciones: <SelectorMes mes={d.mes} opciones={d.opciones} /> })}
    >
      {(d) => (
        <div className="flex flex-col gap-4">
          <PestanasCompras activa="impuestos" />
          <Estado state={d.state} variante="detalle">
            {d.f29 ? <VistaF29 f={d.f29} /> : null}
          </Estado>
        </div>
      )}
    </PaginaPortal>
  );
}
