import { Empty, Estado, Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { cargarPeriodos, permisosNomina } from "../_componentes/datos";
import { FormNovedad } from "../_componentes/form-novedad";
import { PanelAutomaticas } from "../_componentes/panel-automaticas";
import { Prestamos } from "../_componentes/prestamos";
import { ReglasAnticipo } from "../_componentes/reglas-anticipo";
import { SegmentoRemuneraciones, SegmentoRemuneracionesMovil } from "../_componentes/segmento-remuneraciones";
import { TablaNovedades } from "../_componentes/tabla-novedades";
import type { Novedad, Periodo, Prestamo, ReglaAnticipo } from "../_componentes/tipos";

export const metadata = { title: "Novedades" };

type Props = { searchParams: SearchParams };
const VISTAS = ["novedades", "anticipos", "prestamos"] as const;

/** Novedades del período (diseño 05) con anticipo quincenal (B2) y préstamos (B3) enlazados. */
export default function Novedades({ searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Remuneraciones"
      ruta="/remuneraciones/novedades"
      cargar={async () => {
        const p = await leerParametros(searchParams);
        const [per, permisos] = await Promise.all([cargarPeriodos(), permisosNomina()]);
        const periodos: Periodo[] = per.ok ? per.data : [];
        const periodo =
          periodos.find((x) => x.id === p["periodo"]) ??
          periodos.find((x) => x.estado !== "pagado") ??
          periodos[0];
        const vista = VISTAS.find((v) => v === p["vista"]) ?? "novedades";
        const [nov, reglas, prestamos] = await Promise.all([
          vista === "novedades" && periodo
            ? ejecutarComoUsuario<Novedad[]>("erp", "nomina.novedades.listar", { periodoId: periodo.id })
            : null,
          vista === "anticipos"
            ? ejecutarComoUsuario<ReglaAnticipo[]>("erp", "nomina.anticipos.reglas_listar", {})
            : null,
          vista === "prestamos"
            ? ejecutarComoUsuario<Prestamo[]>("erp", "nomina.prestamos.listar", {})
            : null,
        ]);
        return { per, permisos, periodos, periodo, vista, nov, reglas, prestamos };
      }}
      opciones={() => ({ insignia: <SegmentoRemuneraciones activa="novedades" /> })}
    >
      {(d) => {
        const base = d.periodo
          ? `/remuneraciones/novedades?periodo=${d.periodo.id}`
          : "/remuneraciones/novedades";
        const abierto = d.periodo?.estado === "abierto" || d.periodo?.estado === "en_revision";
        const cargas = [d.per, d.nov, d.reglas, d.prestamos].filter((r) => r !== null);
        return (
          <div className="flex flex-col gap-4">
            <SegmentoRemuneracionesMovil activa="novedades" />
            {d.periodo ? (
              <>
                <Segmentado
                  etiqueta="Período"
                  activa={d.periodo.id}
                  Link={LinkNext}
                  opciones={d.periodos
                    .slice(0, 6)
                    .map((x) => ({
                      id: x.id,
                      etiqueta: x.etiqueta,
                      href: `/remuneraciones/novedades?periodo=${x.id}&vista=${d.vista}`,
                    }))}
                />
                <Segmentado
                  etiqueta="Vista"
                  activa={d.vista}
                  Link={LinkNext}
                  opciones={[
                    { id: "novedades", etiqueta: "Novedades", href: `${base}&vista=novedades` },
                    { id: "anticipos", etiqueta: "Anticipos", href: `${base}&vista=anticipos` },
                    { id: "prestamos", etiqueta: "Préstamos", href: `${base}&vista=prestamos` },
                  ]}
                />
              </>
            ) : null}
            <Estado state={estadoPantalla(...cargas)} variante="lista">
              {!d.periodo ? (
                <Empty
                  titulo="Aún no hay períodos"
                  descripcion="Abre un período en la pestaña Períodos para cargar novedades."
                />
              ) : (
                <>
                  {abierto && d.permisos.novedades ? (
                    <div>
                      <FormNovedad periodo={d.periodo} />
                    </div>
                  ) : null}
                  {abierto && (d.permisos.anticipos || d.permisos.prestamos) ? (
                    <PanelAutomaticas
                      periodoId={d.periodo.id}
                      anticipos={d.permisos.anticipos}
                      prestamos={d.permisos.prestamos}
                    />
                  ) : null}
                  {d.nov?.ok ? (
                    <TablaNovedades novedades={d.nov.data} puedeAnular={d.permisos.novedades && abierto} />
                  ) : null}
                  {d.reglas?.ok ? (
                    <ReglasAnticipo reglas={d.reglas.data} gestiona={d.permisos.anticipos} />
                  ) : null}
                  {d.prestamos?.ok ? (
                    <Prestamos
                      prestamos={d.prestamos.data}
                      gestiona={d.permisos.prestamos}
                      hoy={{ anio: d.periodo.anio, mes: d.periodo.mes }}
                    />
                  ) : null}
                </>
              )}
            </Estado>
          </div>
        );
      }}
    </PaginaPortal>
  );
}
