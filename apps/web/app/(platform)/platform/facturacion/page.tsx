import { KpiTile } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { exigirDatos } from "@/lib/carga";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { Superadmin } from "../_componentes/formato";
import { clp, enMoneda, mesesRecientes, nombreMes, type Resumen } from "./_componentes/cobro";
import { GenerarCargos } from "./_componentes/generar-cargos";
import { PruebasPorVencer } from "./_componentes/pruebas-por-vencer";
import { TablaEmpresas } from "./_componentes/tabla-empresas";

export const metadata = { title: "Facturación" };

const mesActual = () => new Date().toISOString().slice(0, 7);

/**
 * Plataforma → Facturación (CAR-188, ADR-071): qué factura cada empresa por cada módulo en un mes,
 * qué no y por qué, con el total; y los cargos listos para facturar de un mes cerrado.
 */
export default function Facturacion({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="platform"
      titulo="Facturación"
      ruta="/platform/facturacion"
      cargando="dashboard"
      opciones={() => ({ insignia: <Superadmin /> })}
      cargar={async () => {
        const p = await leerParametros(searchParams);
        const periodo = /^\d{4}-\d{2}$/.test(p["mes"] ?? "") ? (p["mes"] as string) : mesActual();
        const r = await ejecutarComoUsuario<Resumen>("platform", "platform.cobros.resumen", {
          periodo,
        });
        // Si falla, `exigirDatos` lanza y la página muestra el error dentro del shell (CAR-50).
        return { periodo, resumen: exigirDatos(r) };
      }}
    >
      {({ periodo, resumen }) => {
        const actual = mesActual();
        const cerrado = periodo < actual;
        const t = resumen.totales;
        const uf = t.porMoneda.find((m) => m.moneda === "UF")?.monto ?? 0;
        return (
          <div className="flex flex-col gap-4">
            <h2 className="t-title text-fg md:hidden">Facturación</h2>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <ChipsFiltro
                filtros={[
                  {
                    param: "mes",
                    etiqueta: "Mes",
                    opciones: mesesRecientes(actual).map((m) => ({
                      valor: m,
                      etiqueta: m === actual ? `${nombreMes(m)} (en curso)` : nombreMes(m),
                    })),
                  },
                ]}
              />
              {cerrado ? (
                <GenerarCargos
                  periodo={periodo}
                  nombres={Object.fromEntries(
                    resumen.empresas.flatMap((e) => [
                      [e.tenantId, e.nombre],
                      ...e.modulos.map((m) => [m.moduloId, m.nombre]),
                    ]),
                  )}
                />
              ) : null}
            </div>
            <p className="t-caption">
              {cerrado ? "Mes cerrado" : "Mes en curso: los montos son una estimación"} ·{" "}
              {nombreMes(periodo)}
              {resumen.uf
                ? ` · UF ${clp(Math.round(resumen.uf.centavos / 100))}${resumen.uf.exacta ? " del último día" : " (última publicada)"}`
                : " · sin UF publicada"}
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <KpiTile
                etiqueta="Total del mes"
                valor={clp(t.totalClp)}
                {...(uf
                  ? {
                      variacion: {
                        texto: `incluye ${enMoneda(uf, "UF")}`,
                        tono: "neutro" as const,
                      },
                    }
                  : {})}
              />
              <KpiTile etiqueta="Se facturan" valor={String(t.facturables)} />
              <KpiTile etiqueta="No se facturan" valor={String(t.noFacturables)} />
              <KpiTile
                etiqueta="Empresas que facturan"
                valor={`${resumen.empresas.filter((e) => e.facturables > 0).length} de ${resumen.empresas.length}`}
              />
            </div>
            <PruebasPorVencer pruebas={resumen.pruebasPorVencer} />
            <TablaEmpresas resumen={resumen} />
          </div>
        );
      }}
    </PaginaPortal>
  );
}
