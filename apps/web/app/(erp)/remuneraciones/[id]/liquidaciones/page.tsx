import { Alerta, GRILLA_KPI_HILO, KpiTile } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { CalcularLiquidaciones } from "../../_componentes/calcular-liquidaciones";
import { cargarPeriodos, permisosNomina } from "../../_componentes/datos";
import { pesos } from "../../_componentes/etiquetas";
import { SegmentoRemuneraciones } from "../../_componentes/segmento-remuneraciones";
import { TablaLiquidaciones } from "../../_componentes/tabla-liquidaciones";
import type { ListaLiquidaciones } from "../../_componentes/tipos";

export const metadata = { title: "Liquidaciones" };

type Props = { params: Promise<{ id: string }> };

/** Liquidaciones del período (diseño 03): resumen, cálculo y una fila por persona. */
export default function LiquidacionesPeriodo({ params }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Liquidaciones"
      ruta="/remuneraciones"
      cargar={async () => {
        const [{ id }, per, perm] = await Promise.all([params, cargarPeriodos(), permisosNomina()]);
        const periodo = per.ok ? (per.data.find((p) => p.id === id) ?? null) : null;
        const lista = perm.novedadesRead
          ? await ejecutarComoUsuario<ListaLiquidaciones>("erp", "nomina.liquidaciones.listar", { periodoId: id, limite: 200 })
          : null;
        return { id, periodo, perm, lista };
      }}
      opciones={(d) => ({
        insignia: <SegmentoRemuneraciones activa="periodos" />,
        volver: { href: `/remuneraciones/${d.id}`, etiqueta: d.periodo?.etiqueta ?? "Período" },
        ...(d.periodo ? { titulo: `Liquidaciones · ${d.periodo.etiqueta}` } : {}),
      })}
    >
      {(d) => {
        const abierto = d.periodo?.estado === "abierto" || d.periodo?.estado === "en_revision";
        if (!d.lista) return <Alerta tono="warning" titulo="Tu rol no puede ver liquidaciones." />;
        if (!d.lista.ok) return <Alerta tono="danger" titulo={d.lista.error.message} />;
        const { items, total } = d.lista.data;
        return (
          <div className="flex flex-col gap-5">
            <div className={`grid grid-cols-2 gap-3 lg:grid-cols-3 ${GRILLA_KPI_HILO}`}>
              <KpiTile etiqueta="Personas" valor={String(total.personas)} />
              <KpiTile etiqueta="Total líquido" valor={pesos(total.liquido)} />
              <KpiTile etiqueta="Costo empresa" valor={pesos(total.costoEmpresa)} />
            </div>
            {abierto && d.perm.periodos ? <CalcularLiquidaciones periodoId={d.id} /> : null}
            {!abierto && d.periodo ? (
              <p className="t-caption text-fg-muted">El período está {d.periodo.estado.replace("_", " ")}: las liquidaciones ya no se recalculan.</p>
            ) : null}
            <TablaLiquidaciones periodoId={d.id} items={items} />
            <p className="t-caption text-fg-muted">
              Cálculo con el motor de sueldos y las novedades del período. Los montos se confirman contra las liquidaciones de referencia antes de usarlos para pagar.
            </p>
          </div>
        );
      }}
    </PaginaPortal>
  );
}
