import { PaginaPortal } from "@/app/_components/pagina-portal";
import { hoyIso, inicioMesIso } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { ListaMarcas, type FilaMarca } from "./_componentes/lista-marcas";

export const metadata = { title: "Marcas de asistencia" };

type Props = { searchParams: SearchParams };

export default function PaginaMarcas({ searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Marcas"
      ruta="/asistencia/marcas"
      completo
      cargar={async () => {
        const p = await leerParametros(searchParams);
        const desde = p.desde ?? inicioMesIso();
        const hasta = p.hasta ?? hoyIso();
        const params: Record<string, string | undefined> = {
          desde,
          hasta,
          q: p.q,
          metodoFamilia: p.metodoFamilia,
          gps: p.gps,
          instalacionId: p.instalacionId,
          personaId: p.personaId,
          cursor: p.cursor,
          marca: p.marca,
        };
        const [lista, hoy] = await Promise.all([
          ejecutarComoUsuario<{ items: FilaMarca[]; siguiente: string | null }>("erp", "asistencia.marcas.listar", {
            desde,
            hasta,
            limite: 50,
            ...(p.q ? { q: p.q } : {}),
            ...(p.metodoFamilia === "rostro" || p.metodoFamilia === "pin" ? { metodoFamilia: p.metodoFamilia } : {}),
            ...(p.gps === "dentro" || p.gps === "fuera" || p.gps === "sin_gps" ? { gpsEstado: p.gps } : {}),
            ...(p.instalacionId ? { instalacionId: p.instalacionId } : {}),
            ...(p.personaId ? { personaId: p.personaId } : {}),
            ...(p.cursor ? { cursor: p.cursor } : {}),
          }),
          ejecutarComoUsuario<{ zona: string }>("erp", "asistencia.dias.hoy", {}),
        ]);
        return {
          state: estadoPantalla(lista),
          items: lista.ok ? lista.data.items : [],
          siguiente: lista.ok ? lista.data.siguiente : null,
          zona: hoy.ok ? hoy.data.zona : "America/Santiago",
          params: { ...params, siguiente: lista.ok ? lista.data.siguiente ?? undefined : undefined },
          marcaAbierta: p.marca ?? null,
        };
      }}
    >
      {(d) => (
        <ListaMarcas
          state={d.state}
          items={d.items}
          zona={d.zona}
          hayMas={d.siguiente !== null}
          marcaAbierta={d.marcaAbierta}
          params={d.params}
        />
      )}
    </PaginaPortal>
  );
}