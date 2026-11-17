import { Cabecera, Forbidden } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { Buscador } from "@/app/_components/maestros/buscador";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { CargaFallida } from "@/lib/carga";
import { conFiltros, leerParametros, type SearchParams } from "@/lib/parametros";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { cargarOpciones, cargarTodas } from "./datos";
import { ListaTodasRendiciones } from "./lista-todas";

const RUTA = "/rendiciones/todas";

export function PaginaTodasRendiciones({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Todas las rendiciones"
      ruta={RUTA}
      cargar={async () => {
        const p = await leerParametros(searchParams);
        try {
          const [pagina, opciones] = await Promise.all([cargarTodas(p), cargarOpciones("erp")]);
          return { ok: true as const, pagina, opciones, p };
        } catch (e) {
          if (e instanceof CargaFallida && e.code === "FORBIDDEN") return { ok: false as const };
          throw e;
        }
      }}
    >
      {(d) =>
        !d.ok ? (
          <Forbidden titulo="Sin permiso para ver todas las rendiciones" descripcion="Necesitas el permiso de ver todas las rendiciones de la empresa." />
        ) : (
          <div className="flex flex-col gap-4">
            <Cabecera
              titulo="Todas las rendiciones"
              subtitulo="Búsqueda y filtros sobre las rendiciones de la empresa."
              acciones={<EnlaceBoton href="/rendiciones" variante="secondary">Mis rendiciones</EnlaceBoton>}
              accionesSiempre
            />
            <Buscador placeholder="Buscar por código REN-n, motivo o quien rinde" />
            <p className="px-4 text-base text-fg-muted md:px-0">
              {d.pagina.items.length}
              {d.pagina.siguiente ? "+" : ""} en esta página · más recientes primero
            </p>
            <ListaTodasRendiciones items={d.pagina.items} opciones={d.opciones} />
            {d.pagina.siguiente ? (
              <LinkNext
                href={conFiltros(RUTA, { ...d.p, cursor: d.pagina.siguiente })}
                className="t-label px-4 py-3 text-accent"
              >
                Siguiente página
              </LinkNext>
            ) : null}
          </div>
        )
      }
    </PaginaPortal>
  );
}