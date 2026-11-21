import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { type Pagina, type Registro, uuid } from "@/app/(erp)/accesos/_componentes/datos";
import type { EntradaLista } from "@/app/(erp)/accesos/_componentes/panel-listas";
import { datosSiHayPermiso, exigirDatos } from "@/lib/carga";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { AccesosCliente, type Instalacion } from "./_componentes/accesos-cliente";
import type { Vista } from "./_componentes/ruta";
import type { Visitas } from "./_componentes/visitas-cliente";

export const metadata = { title: tituloPagina("cliente", "Accesos") };

const VISTAS: Vista[] = ["en_sitio", "registros", "visitas", "listas"];

/** Listas de una instalación; sin el interruptor de la empresa (FORBIDDEN) quedan en null y la vista lo explica. */
async function cargarListas(instalacionId: string, lista: string | undefined, cursor: string | undefined) {
  const tipo = lista === "bloqueada" ? "bloqueada" : "autorizada";
  const r = await ejecutarComoUsuario<Pagina<EntradaLista>>("cliente", "acceso.portal_listas.listar", {
    instalacionId,
    tipo,
    ...(cursor ? { cursor } : {}),
  });
  return { tipo, pagina: datosSiHayPermiso(r, null) } as const;
}

/**
 * Accesos del Portal Cliente (diseño `ClienteAccesos`): quién está en sitio y los registros de las
 * instalaciones de su cuenta (CAR-481), sus visitas prerregistradas (CAR-539) y sus listas (CAR-538). El alcance lo aplica la capacidad (ADR-022).
 */
export default function Accesos({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="cliente"
      titulo="Accesos"
      ruta="/cliente/accesos"
      cargando="lista"
      cargar={async () => {
        const p = await leerParametros(searchParams);
        const vista = VISTAS.find((v) => v === p["vista"]) ?? "en_sitio";
        const yo = await ejecutarComoUsuario<{ instalaciones: Instalacion[] }>(
          "cliente",
          "portal_cliente.mi_acceso",
          {},
        );
        const instalaciones = yo.ok ? yo.data.instalaciones : [];
        const elegida = uuid(p["instalacion"]);
        const cursor = uuid(p["cursor"]);
        if (vista === "listas") {
          const instalacion = elegida ?? instalaciones[0]?.id;
          const listas = instalacion ? await cargarListas(instalacion, p["lista"], cursor) : null;
          return { items: [], siguiente: null, instalaciones, instalacion, vista, listas, visitas: null };
        }
        const filtro = { ...(elegida ? { instalacionId: elegida } : {}), ...(cursor ? { cursor } : {}) };
        if (vista === "visitas") {
          const v = await ejecutarComoUsuario<Visitas>("cliente", "acceso.portal_visitas.listar", filtro);
          const visitas = exigirDatos(v);
          return { items: [], siguiente: null, instalaciones, instalacion: elegida, vista, listas: null, visitas };
        }
        const r = await ejecutarComoUsuario<Pagina<Registro>>("cliente", "acceso.portal_registros.listar", {
          soloEnSitio: vista === "en_sitio",
          ...filtro,
        });
        return { ...exigirDatos(r), instalaciones, instalacion: elegida, vista, listas: null, visitas: null };
      }}
    >
      {(d) => <AccesosCliente {...d} />}
    </PaginaPortal>
  );
}
