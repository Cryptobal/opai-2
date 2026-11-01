import { Empty, Estado, KpiTile } from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";

import { BarraPauta } from "./barra-pauta";
import { Diaria } from "./diaria";
import type { DatosPauta } from "./datos";
import { pct } from "./etiquetas";
import { GrillaMes } from "./grilla-mes";
import { HojaExcepcion } from "./hoja-excepcion";
import { HojaHistorial } from "./hoja-historial";
import { HojaSerie } from "./hoja-serie";
import { ListaDias } from "./lista-dias";
import { PpcLista } from "./ppc-lista";
import { TodasInstalaciones } from "./todas-instalaciones";
import type { ResumenCobertura } from "./tipos";

function Resumen({ r }: { r: ResumenCobertura }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <KpiTile etiqueta="Cobertura del mes" valor={pct(r.cobertura)} />
      <KpiTile etiqueta="Turnos sin cubrir" valor={String(r.ppc)} />
      <div className="col-span-2 md:col-span-1">
        <KpiTile etiqueta="Turnos programados" valor={String(r.programados)} />
      </div>
    </div>
  );
}

/** Pauta · Mensual: barra, resumen y la vista elegida (P05 todas, P01 instalación, P06 sin cubrir). */
export function ContenidoPauta({ d, puedeEditar }: { d: DatosPauta; puedeEditar: boolean }) {
  const resumen = d.mensual?.resumen ?? d.todas?.resumen;
  const sinDatos = d.mensual ? d.mensual.puestos.length === 0 : (d.todas?.instalaciones.length ?? 0) === 0;
  return (
    <div className="flex flex-col gap-4">
      <BarraPauta instalaciones={d.instalaciones} inst={d.inst} anio={d.anio} mes={d.mes} verPpc={d.verPpc} diaria={d.diaria} fecha={d.fecha} />
      <Estado
        state={d.state}
        variante="planilla"
        textos={{ error: { accion: <BotonReintentar /> } }}
      >
        {!d.diaria && resumen ? <Resumen r={resumen} /> : null}
        {d.diaria ? <Diaria mes={d.mensual} fecha={d.fecha} sinCubrir={d.verPpc} /> : sinDatos ? (
          <Empty
            titulo={d.mensual ? "Esta instalación no tiene puestos" : "Aún no hay puestos con pauta"}
            descripcion="Crea los puestos de la instalación y fija su serie para ver la cobertura."
          />
        ) : d.verPpc && d.ppc ? (
          <PpcLista ppc={d.ppc} anio={d.anio} mes={d.mes} />
        ) : d.mensual ? (
          <>
            <GrillaMes mes={d.mensual} puedeEditar={puedeEditar} />
            <ListaDias mes={d.mensual} />
          </>
        ) : d.todas ? (
          <TodasInstalaciones datos={d.todas} />
        ) : null}
        {d.mensual ? (
          <>
            <HojaSerie mes={d.mensual} puedeEditar={puedeEditar} />
            <HojaExcepcion mes={d.mensual} puedeEditar={puedeEditar} />
          </>
        ) : null}
      </Estado>
      <HojaHistorial lineas={d.historial} />
    </div>
  );
}
