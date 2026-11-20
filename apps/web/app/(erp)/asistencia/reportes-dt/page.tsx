import { PaginaPortal } from "@/app/_components/pagina-portal";
import { hoyIso, inicioMesIso } from "@/lib/fechas";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { ContenidoReportesDt } from "./_componentes/contenido";

export const metadata = { title: "Reportes DT" };

type Cat = { items: { id: string; titulo: string; descripcion: string; obligatorio: boolean }[] };
type VistaData = {
  tipo: string;
  titulo: string;
  cabecera: {
    razonSocial: string;
    rutEmpleador: string;
    trabajador: string | null;
    rutTrabajador: string | null;
    lugar: string;
    periodo: string;
  };
  columnas: { clave: string; etiqueta: string }[];
  filas: Record<string, string | number | boolean | null>[];
  siglasUsadas: string[];
  totalFilas: number;
  provisorio: boolean;
};

async function cargarVista(p: Record<string, string | undefined>) {
  const tipo = p.tipo ?? "asistencia";
  const desde = p.desde ?? inicioMesIso();
  const hasta = p.hasta ?? hoyIso();
  const r = await ejecutarComoUsuario<VistaData>("erp", "asistencia.reportes.vista", {
    tipo,
    desde,
    hasta,
    ...(p.personaId ? { personaId: p.personaId } : {}),
    ...(p.instalacionId ? { instalacionId: p.instalacionId } : {}),
  });
  return r.ok ? r.data : null;
}

export default async function ReportesDt({ searchParams }: { searchParams: SearchParams }) {
  const p = await leerParametros(searchParams);
  const params: Record<string, string | undefined> = {
    tipo: p.tipo,
    desde: p.desde ?? inicioMesIso(),
    hasta: p.hasta ?? hoyIso(),
    personaId: p.personaId,
    instalacionId: p.instalacionId,
  };
  return (
    <PaginaPortal
      portal="erp"
      titulo="Reportes DT"
      ruta="/asistencia/reportes-dt"
      completo
      cargar={async () => {
        const cat = await ejecutarComoUsuario<Cat>("erp", "asistencia.reportes.catalogo", {});
        const vista = cat.ok ? await cargarVista(params) : null;
        return { catalogo: cat.ok ? cat.data.items : [], vista, params };
      }}
    >
      {(d) => <ContenidoReportesDt catalogo={d.catalogo} vista={d.vista} params={d.params} />}
    </PaginaPortal>
  );
}