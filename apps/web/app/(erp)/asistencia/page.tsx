import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { HoyLista, type ItemHoy } from "./_componentes/hoy-lista";

export const metadata = { title: "Asistencia de hoy" };
type Props = { searchParams: SearchParams };

type Datos = {
  fecha: string;
  zona: string;
  resumen: { turnos: number; presentes: number; sinMarca: number; ausentes: number; incompletos: number; atrasos: number };
  items: ItemHoy[];
};

const OPCIONES = [
  { valor: "presente", etiqueta: "Presente" },
  { valor: "sin_marca", etiqueta: "Sin marca" },
  { valor: "ausente", etiqueta: "Ausente" },
  { valor: "incompleto", etiqueta: "Sin salida" },
];

/** «Asistencia de hoy» (A3): presentes, sin marca, atrasos y correcciones pendientes de los turnos del día. */
export default function AsistenciaHoy({ searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Asistencia de hoy"
      ruta="/asistencia"
      completo
      cargar={async () => {
        const p = await leerParametros(searchParams);
        return ejecutarComoUsuario<Datos>("erp", "asistencia.dias.hoy", p["estado"] ? { estado: p["estado"] } : {});
      }}
    >
      {(r) =>
        r.ok && r.data ? (
          <HoyLista
            state={estadoPantalla(r)}
            fecha={r.data.fecha}
            zona={r.data.zona}
            resumen={r.data.resumen}
            items={r.data.items}
            opcionesFiltro={OPCIONES}
          />
        ) : (
          <HoyLista state={estadoPantalla(r)} fecha="" zona="America/Santiago" resumen={{ turnos: 0, presentes: 0, sinMarca: 0, ausentes: 0, incompletos: 0, atrasos: 0 }} items={[]} opcionesFiltro={OPCIONES} />
        )
      }
    </PaginaPortal>
  );
}