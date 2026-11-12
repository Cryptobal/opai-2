import { DashboardScreen, Segmentado, type Kpi } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { fecha, pesos } from "@/lib/fechas";
import type { SearchParams } from "@/lib/parametros";

import { cargarReportes, PERIODOS, rutaReportes, type Periodo, type Tablero } from "./datos";
import { PorResponsable } from "./por-responsable";
import { PrimeraRespuesta } from "./primera-respuesta";
import { Canales, Embudo, GanadosPerdidos, Pronostico } from "./secciones";

export const metadata = { title: "Reportes comerciales" };
type Props = { searchParams: SearchParams };

const NOMBRE: Record<Periodo, string> = { mes: "este mes", trimestre: "este trimestre", anio: "este año" };
const ANTERIOR: Record<Periodo, string> = { mes: "el mes anterior", trimestre: "el trimestre anterior", anio: "el año anterior" };

function kpis(t: Tablero): Kpi[] {
  const a = t.cierreAnterior;
  const c = t.cierre;
  const puntos = c.conversionPct !== null && a.conversionPct !== null ? c.conversionPct - a.conversionPct : null;
  const dias = c.cicloPromedioDias !== null && a.cicloPromedioDias !== null ? c.cicloPromedioDias - a.cicloPromedioDias : null;
  const signo = (n: number) => (n > 0 ? `+${n}` : `${n}`.replace("-", "−"));
  return [
    { etiqueta: "En curso", valor: pesos(t.enCurso.montoMensualClp), variacion: { texto: `${t.enCurso.cantidad} ${t.enCurso.cantidad === 1 ? "negocio abierto" : "negocios abiertos"}`, tono: "neutro" } },
    { etiqueta: `Ganado ${NOMBRE[t.periodo]}`, valor: pesos(c.montoGanadoMensualClp), variacion: { texto: `${c.ganados} ${c.ganados === 1 ? "negocio" : "negocios"} · ${pesos(a.montoGanadoMensualClp)} en todo ${ANTERIOR[t.periodo]}`, tono: "neutro" } },
    { etiqueta: "Conversión", valor: c.conversionPct === null ? "—" : `${c.conversionPct} %`, ...(puntos === null ? {} : { variacion: { texto: `${signo(puntos)} pts vs ${ANTERIOR[t.periodo]}`, tono: puntos >= 0 ? "success" as const : "danger" as const } }) },
    { etiqueta: "Ciclo promedio", valor: c.cicloPromedioDias === null ? "—" : `${c.cicloPromedioDias} días`, ...(dias === null ? {} : { variacion: { texto: `${signo(dias)} días vs ${ANTERIOR[t.periodo]}`, tono: dias <= 0 ? "success" as const : "danger" as const } }) },
  ];
}

const sinDatos = (t: Tablero) =>
  t.enCurso.cantidad === 0 && t.cierre.ganados + t.cierre.perdidos === 0 && t.cierreAnterior.ganados + t.cierreAnterior.perdidos === 0 && t.perdidas.motivos.length === 0 && t.responsables.length === 0 && !(t.canales ?? []).some((c) => c.solicitudes > 0);

/** Reportes comerciales (CAR-27, export «ReportesComerciales»): tablero de solo lectura sobre una capacidad. */
export default function ReportesComerciales({ searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Reportes comerciales"
      ruta="/negocios/reportes"
      cargar={() => cargarReportes(searchParams)}
      opciones={() => ({ volver: { href: "/negocios", etiqueta: "Negocios" } })}
    >
      {(d) => {
        const t = d.tablero;
        const filtros = (
          <Segmentado
            etiqueta="Período"
            activa={d.periodo}
            Link={LinkNext}
            opciones={PERIODOS.map((p) => ({ id: p.id, etiqueta: p.etiqueta, href: rutaReportes(p.id, d.responsableId) }))}
          />
        );
        return (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3">{filtros}</div>
            <DashboardScreen
              state={t ? (sinDatos(t) ? "empty" : "ready") : d.state === "ready" ? "error" : d.state}
              titulo="Reportes comerciales"
              {...(t ? { subtitulo: `Del ${fecha(t.desde)} al ${fecha(t.hasta)} · ${d.responsableId ? "un responsable" : "todo el equipo"}` } : {})}
              kpis={t ? kpis(t) : []}
              textos={{
                vacio: {
                  titulo: "Sin negocios en este período",
                  descripcion: "Cambia el período o quita el filtro de responsable para ver datos.",
                  accion: d.responsableId ? (
                    <EnlaceBoton href={rutaReportes(d.periodo)} variante="secondary">Ver todo el equipo</EnlaceBoton>
                  ) : d.periodo === "anio" ? (
                    <EnlaceBoton href="/negocios" variante="secondary">Ir a Negocios</EnlaceBoton>
                  ) : (
                    <EnlaceBoton href={rutaReportes("anio")} variante="secondary">Ver el año</EnlaceBoton>
                  ),
                },
              }}
            >
              {t ? (
                <>
                  <Embudo t={t} />
                  <GanadosPerdidos t={t} />
                  {t.canales ? <Canales canales={t.canales} /> : null}
                  {t.primeraRespuesta ? <PrimeraRespuesta r={t.primeraRespuesta} /> : null}
                  <Pronostico t={t} />
                  <PorResponsable t={t} periodo={d.periodo} responsableId={d.responsableId} />
                </>
              ) : null}
            </DashboardScreen>
          </>
        );
      }}
    </PaginaPortal>
  );
}
