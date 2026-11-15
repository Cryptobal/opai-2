import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Cabecera, Estado, Forbidden, KpiTile, Segmentado, SeccionTarjeta, Table, Td, Th, Tr } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { pesos } from "../formato";
import { cargarReporte } from "./datos";
import { AGRUPAR, etiquetaMes, filtrosDe, hrefExcel, hrefReporte, mesVecino, RUTA_REPORTE } from "./periodo";

type Q = Record<string, string | string[] | undefined>;

/** Reporte (07, CAR-179): gasto rendido del mes agrupado por persona, categoría o centro de costo, con descarga a Excel. */
export function PaginaReporte({ searchParams }: { searchParams: Promise<Q> }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Reporte de rendiciones"
      ruta={RUTA_REPORTE}
      cargando="lista"
      volver={{ href: "/rendiciones", etiqueta: "Rendiciones" }}
      cargar={async () => {
        const filtros = filtrosDe(await searchParams);
        return { filtros, reporte: await cargarReporte(filtros) };
      }}
    >
      {({ filtros, reporte }) => {
        if (!reporte)
          return <Forbidden titulo="No tienes acceso al reporte" descripcion="Necesitas el permiso para ver todas las rendiciones de la empresa." />;
        const columna = AGRUPAR.find((a) => a.id === filtros.agrupar)?.etiqueta ?? "Grupo";
        return (
          <div className="flex flex-col gap-4">
            <Cabecera
              titulo="Reporte de rendiciones"
              subtitulo="Rendiciones aprobadas y pagadas, por mes de aprobación."
              acciones={reporte.cantidad > 0 ? <EnlaceBoton href={hrefExcel(filtros.mes)} variante="secondary" icono={Download}>Exportar a Excel</EnlaceBoton> : null}
              accionesSiempre
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <nav aria-label="Mes del reporte" className="flex items-center gap-1">
                <EnlaceBoton href={hrefReporte({ ...filtros, mes: mesVecino(filtros.mes, -1) })} variante="ghost" icono={ChevronLeft} etiqueta="Mes anterior">{""}</EnlaceBoton>
                <span className="t-title min-w-40 text-center tabular-nums" aria-live="polite">{etiquetaMes(filtros.mes)}</span>
                <EnlaceBoton href={hrefReporte({ ...filtros, mes: mesVecino(filtros.mes, 1) })} variante="ghost" icono={ChevronRight} etiqueta="Mes siguiente">{""}</EnlaceBoton>
              </nav>
              <Segmentado
                etiqueta="Agrupar por"
                Link={LinkNext}
                activa={filtros.agrupar}
                opciones={AGRUPAR.map((a) => ({ id: a.id, etiqueta: a.etiqueta, href: hrefReporte({ ...filtros, agrupar: a.id }) }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <KpiTile etiqueta="Total rendido" valor={pesos(reporte.totalClp)} />
              <KpiTile etiqueta="Aprobado por pagar" valor={pesos(reporte.aprobadoClp)} />
              <KpiTile etiqueta="Pagado" valor={pesos(reporte.pagadoClp)} />
            </div>
            <SeccionTarjeta titulo={`Por ${columna.toLowerCase()}`} sinRelleno>
              <Estado
                state={reporte.grupos.length === 0 ? "empty" : "ready"}
                variante="lista"
                textos={{ vacio: { titulo: `Sin gasto rendido en ${etiquetaMes(filtros.mes).toLowerCase()}`, descripcion: "Aquí aparecen las rendiciones cuando se aprueban." } }}
              >
                <Table>
                  <thead>
                    <tr><Th>{columna}</Th><Th className="text-right">Rendiciones</Th><Th className="hidden text-right md:table-cell">Por pagar</Th><Th className="hidden text-right md:table-cell">Pagado</Th><Th className="text-right">Total</Th></tr>
                  </thead>
                  <tbody>
                    {reporte.grupos.map((g) => (
                      <Tr key={g.clave}>
                        <Td className="font-medium text-fg">{g.etiqueta}</Td>
                        <Td className="text-right tabular-nums">{g.cantidad}</Td>
                        <Td className="hidden text-right tabular-nums md:table-cell">{pesos(g.aprobadoClp)}</Td>
                        <Td className="hidden text-right tabular-nums md:table-cell">{pesos(g.pagadoClp)}</Td>
                        <Td className="text-right font-medium tabular-nums">{pesos(g.totalClp)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </Estado>
            </SeccionTarjeta>
          </div>
        );
      }}
    </PaginaPortal>
  );
}
