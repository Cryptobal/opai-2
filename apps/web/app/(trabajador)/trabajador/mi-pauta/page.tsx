import { Estado } from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { estadoTrabajador, SIN_FICHA } from "../_componentes/estado";
import { ListaTurnos } from "./_componentes/lista-turnos";
import { fechaValida, type MisTurnos } from "./_componentes/semanas";

export const metadata = { title: tituloPagina("trabajador", "Mi pauta") };

/**
 * Mi pauta (CAR-462, parte 1 de CAR-357): los turnos de la propia persona. El alcance (solo los suyos) lo aplica la
 * capacidad en la consulta, no la pantalla (ADR-022). «Hoy» lo calcula la capacidad en la zona de la empresa. Sin
 * ficha vinculada, el estado vacío con orientación, como el resto del portal.
 */
export default function Pagina({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="trabajador"
      titulo="Mi pauta"
      ruta="/trabajador/mi-pauta"
      cargando="lista"
      cargar={async () => {
        const { desde } = await leerParametros(searchParams);
        const r = await ejecutarComoUsuario<MisTurnos>("trabajador", "portal_trabajador.mis_turnos.listar", {
          dias: 28,
          limite: 200,
          ...(fechaValida(desde) ? { desde } : {}),
        });
        return { state: estadoTrabajador(r), datos: r.ok ? r.data : null };
      }}
    >
      {({ state, datos }) => (
        <Estado state={state} variante="lista" textos={{ vacio: SIN_FICHA, error: { accion: <BotonReintentar /> } }}>
          {datos ? <ListaTurnos r={datos} /> : null}
        </Estado>
      )}
    </PaginaPortal>
  );
}
