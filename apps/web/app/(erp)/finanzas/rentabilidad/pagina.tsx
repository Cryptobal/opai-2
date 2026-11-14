import { ChevronLeft, ChevronRight } from "lucide-react";
import { Alerta, Cabecera, Estado, Forbidden, KpiTile, SeccionTarjeta, Table, Td, Th, Tr } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { etiquetaMes, mesActual, mesVecino } from "@/app/_components/rendiciones/reporte/periodo";
import { pesos } from "@/lib/fechas";

import { cargarRentabilidad, porcentaje } from "./datos";

type Q = Record<string, string | string[] | undefined>;
const RUTA = "/finanzas/rentabilidad";

/** Rentabilidad por instalación (CAR-174): ventas del mes contra costo laboral ESTIMADO de sus puestos. */
export function PaginaRentabilidad({ searchParams }: { searchParams: Promise<Q> }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Rentabilidad por instalación"
      ruta={RUTA}
      volver={{ href: "/finanzas", etiqueta: "Finanzas" }}
      cargar={async () => {
        const q = await searchParams;
        const actual = mesActual();
        const pedido = typeof q["mes"] === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(q["mes"]) ? q["mes"] : actual;
        const mes = pedido > actual ? actual : pedido;
        return { mes, actual, r: await cargarRentabilidad(mes) };
      }}
    >
      {({ mes, actual, r }) => {
        if (!r) return <Forbidden titulo="No tienes acceso a este informe" descripcion="Necesitas el permiso para ver Finanzas." />;
        const ocultos = r.totales.puestosOcultos;
        const sinCosto = r.totales.puestosSinCosto;
        return (
          <div className="flex flex-col gap-4">
            <Cabecera titulo="Rentabilidad por instalación" subtitulo="Ventas del mes sin IVA contra el costo estimado del personal de cada instalación. No son liquidaciones." />
            <nav aria-label="Mes del informe" className="flex items-center gap-1">
              <EnlaceBoton href={`${RUTA}?mes=${mesVecino(mes, -1)}`} variante="ghost" icono={ChevronLeft} etiqueta="Mes anterior">{""}</EnlaceBoton>
              <span className="t-title min-w-40 text-center tabular-nums">{etiquetaMes(mes)}</span>
              {mes < actual ? <EnlaceBoton href={`${RUTA}?mes=${mesVecino(mes, 1)}`} variante="ghost" icono={ChevronRight} etiqueta="Mes siguiente">{""}</EnlaceBoton> : null}
            </nav>
            {r.sinValoresLegales ? <Alerta tono="warning" titulo="Faltan valores legales del mes">Sin UF, topes y tasas publicados no se puede estimar el costo del personal.</Alerta> : null}
            {ocultos > 0 ? <Alerta tono="info" titulo={`${ocultos} puesto(s) sin costo visible`}>Los montos de sueldo solo los ve quien tiene permiso para ver sueldos.</Alerta> : null}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <KpiTile etiqueta="Ventas netas" valor={pesos(r.totales.ventasNetasClp)} />
              <KpiTile etiqueta="Costo estimado del personal" valor={pesos(r.totales.costoEstimadoClp)} />
              <KpiTile etiqueta="Margen estimado" valor={`${pesos(r.totales.margenClp)} · ${porcentaje(r.totales.margenPct)}`} />
            </div>
            <SeccionTarjeta titulo="Por instalación" sinRelleno>
              <Estado state={r.instalaciones.length === 0 ? "empty" : "ready"} variante="lista" textos={{ vacio: { titulo: `Sin ventas ni puestos en ${etiquetaMes(mes).toLowerCase()}`, descripcion: "Aparecen las instalaciones con ventas emitidas o puestos activos en el mes." } }}>
                <Table>
                  <thead>
                    <tr><Th>Instalación</Th><Th className="hidden text-right md:table-cell">Ventas netas</Th><Th className="hidden text-right md:table-cell">Costo estimado</Th><Th className="text-right">Margen</Th><Th className="text-right">%</Th></tr>
                  </thead>
                  <tbody>
                    {r.instalaciones.map((f) => (
                      <Tr key={f.instalacionId ?? "sin"}>
                        <Td>
                          <span className="font-medium text-fg">{f.nombre}</span>
                          {f.puestosSinCosto + f.puestosOcultos > 0 ? <span className="block t-caption text-fg-muted">{f.puestosSinCosto + f.puestosOcultos} de {f.puestos} puesto(s) sin costo</span> : null}
                        </Td>
                        <Td className="hidden text-right tabular-nums md:table-cell">{pesos(f.ventasNetasClp)}</Td>
                        <Td className="hidden text-right tabular-nums md:table-cell">{pesos(f.costoEstimadoClp)}</Td>
                        <Td className={`text-right font-medium tabular-nums ${f.margenClp < 0 ? "text-danger-fg" : ""}`}>{pesos(f.margenClp)}</Td>
                        <Td className="text-right tabular-nums">{porcentaje(f.margenPct)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </Estado>
            </SeccionTarjeta>
            {sinCosto > 0 ? <p className="t-caption text-fg-muted">{sinCosto} puesto(s) no tienen sueldo definido en su puesto ni en su instalación y no suman costo.</p> : null}
          </div>
        );
      }}
    </PaginaPortal>
  );
}
