import { Estado } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { permisosNomina } from "../_componentes/datos";
import { ListaObligaciones } from "../_componentes/lista-obligaciones";
import { SegmentoRemuneraciones, SegmentoRemuneracionesMovil } from "../_componentes/segmento-remuneraciones";
import type { Obligacion } from "../_componentes/tipos";

export const metadata = { title: "Calendario de obligaciones" };

/** Calendario de obligaciones (diseño 10): lo que hay que generar, cargar y pagar cada mes y cada año. */
export default function Calendario({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Remuneraciones"
      ruta="/remuneraciones/calendario"
      cargar={async () => {
        const p = await leerParametros(searchParams);
        const anio = Number(p["anio"]) || new Date().getFullYear();
        const [r, permisos] = await Promise.all([
          ejecutarComoUsuario<Obligacion[]>("erp", "nomina.obligaciones.listar", { anio }),
          permisosNomina(),
        ]);
        return { r, permisos, anio };
      }}
      opciones={() => ({ insignia: <SegmentoRemuneraciones activa="calendario" /> })}
    >
      {(d) => (
        <div className="flex flex-col gap-4">
          <SegmentoRemuneracionesMovil activa="calendario" />
          <Estado state={estadoPantalla(d.r)} variante="lista">
            {d.r.ok ? (
              <ListaObligaciones obligaciones={d.r.data} anio={d.anio} gestiona={d.permisos.obligaciones} />
            ) : null}
          </Estado>
        </div>
      )}
    </PaginaPortal>
  );
}
