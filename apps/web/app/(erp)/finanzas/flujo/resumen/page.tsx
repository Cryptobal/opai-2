import { DashboardScreen, type Kpi, Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { fecha, pesos } from "@/lib/fechas";
import type { SearchParams } from "@/lib/parametros";

import { ATRASOS, cargarResumen, rutaResumen, VISTAS, type Resumen } from "./datos";
import { Periodos } from "./periodos";

export const metadata = { title: "Resumen del flujo de caja" };

const semanas = (n: number) => `${n} ${n === 1 ? "semana" : "semanas"}`;

function kpis(r: Resumen): Kpi[] {
  const i = r.indicadores;
  return [
    { etiqueta: "Saldo al final", valor: i.finHorizonte ? pesos(i.finHorizonte.saldo) : "—", ...(i.finHorizonte ? { variacion: { texto: `Semana del ${fecha(i.finHorizonte.semana)}`, tono: "neutro" as const } } : {}) },
    { etiqueta: "Semanas de caja", valor: i.primerNegativo ? semanas(i.semanasDeCaja) : "Todo el horizonte", variacion: i.primerNegativo ? { texto: `Negativo la semana del ${fecha(i.primerNegativo.semana)}`, tono: "danger" } : { texto: "Sin saldo negativo", tono: "success" } },
    { etiqueta: "Saldo mínimo", valor: i.minimo ? pesos(i.minimo.saldo) : "—", ...(i.minimo ? { variacion: { texto: `Semana del ${fecha(i.minimo.semana)}`, tono: i.minimo.saldo < 0 ? "danger" as const : "neutro" as const } } : {}) },
    { etiqueta: "Bajo el umbral", valor: semanas(i.semanasBajoUmbral), variacion: i.primerQuiebre ? { texto: `Desde la semana del ${fecha(i.primerQuiebre.semana)} · umbral ${pesos(r.umbral)}`, tono: "warning" } : { texto: `Umbral ${pesos(r.umbral)}`, tono: "success" } },
  ];
}

/** Resumen del flujo de caja (CAR-378): por mes o semana, indicadores de caja y escenario de cobros atrasados. */
export default function ResumenFlujo({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Resumen del flujo"
      ruta="/finanzas/flujo/resumen"
      cargar={() => cargarResumen(searchParams)}
      opciones={() => ({ volver: { href: "/finanzas/flujo", etiqueta: "Flujo de caja" } })}
    >
      {(d) => {
        const r = d.resumen;
        return (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <Segmentado etiqueta="Vista" activa={d.vista} Link={LinkNext} opciones={VISTAS.map((v) => ({ id: v.id, etiqueta: v.etiqueta, href: rutaResumen(v.id, d.atraso) }))} />
              <Segmentado etiqueta="Si los clientes pagan" activa={d.atraso} Link={LinkNext} opciones={ATRASOS.map((a) => ({ id: a.id, etiqueta: a.etiqueta, href: rutaResumen(d.vista, a.id) }))} />
            </div>
            <DashboardScreen
              state={r ? (r.periodos.length ? "ready" : "empty") : d.state === "ready" ? "error" : d.state}
              titulo="Resumen del flujo"
              subtitulo={r?.fuenteSaldo === "ajustes" ? "Parte del saldo inicial de los ajustes: ninguna cuenta del banco tiene saldo." : d.atraso === "0" ? "Desde el saldo del banco de hoy." : `Escenario: los clientes pagan ${d.atraso === "1" ? "1 semana" : `${d.atraso} semanas`} tarde. No se guarda nada.`}
              kpis={r ? kpis(r) : []}
              textos={{ vacio: { titulo: "Sin semanas para resumir", descripcion: "Revisa el horizonte en los ajustes del flujo.", accion: <EnlaceBoton href="/finanzas/flujo" variante="secondary">Ir al flujo</EnlaceBoton> } }}
            >
              {r ? <Periodos r={r} vista={d.vista} /> : null}
            </DashboardScreen>
          </>
        );
      }}
    </PaginaPortal>
  );
}
