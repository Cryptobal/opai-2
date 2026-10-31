import { Estado } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";

import { AbrirPeriodo } from "./_componentes/abrir-periodo";
import { cargarPeriodos, mesSugerido, permisosNomina } from "./_componentes/datos";
import { ListaPeriodos } from "./_componentes/lista-periodos";
import { NavegacionNomina } from "./_componentes/navegacion";

export const metadata = { title: "Nómina" };

/** Períodos de remuneraciones (diseño 01): estado de cada mes y las acciones del cierre. */
export default function Nomina() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Nómina"
      ruta="/nomina"
      cargar={async () => {
        const [r, p] = await Promise.all([cargarPeriodos(), permisosNomina()]);
        return { r, p };
      }}
      opciones={(d) => (d.p.periodos && d.r.ok ? { acciones: <AbrirPeriodo sugerido={mesSugerido(d.r.data)} /> } : {})}
    >
      {(d) => (
        <div className="flex flex-col gap-4">
          <NavegacionNomina activa="periodos" />
          <Estado state={estadoPantalla(d.r)} variante="lista">
            {d.r.ok ? (
              <ListaPeriodos
                periodos={d.r.data}
                sugerido={mesSugerido(d.r.data)}
                gestiona={d.p.periodos}
                puedePagar={d.p.pagar}
                puedeVerNovedades={d.p.novedadesRead}
              />
            ) : null}
          </Estado>
        </div>
      )}
    </PaginaPortal>
  );
}
