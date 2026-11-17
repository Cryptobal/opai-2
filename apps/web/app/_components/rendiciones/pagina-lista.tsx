import { Cabecera, Forbidden } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { CargaFallida } from "@/lib/carga";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { identidadActual } from "@/lib/servidor";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { Buscador } from "@/app/_components/maestros/buscador";

import { cargarAdministrador, cargarListaPropias } from "./datos";
import { ListaRendiciones } from "./lista";
import { PestanasRendiciones } from "./pestanas";
import { BASE, PESTANAS, type PestanaId, type PortalRendicion } from "./tipos";

function rutaCon(p: Record<string, string | undefined>, base: string, extra?: Record<string, string>) {
  const url = new URL(base, "http://x");
  for (const [k, v] of Object.entries(p)) if (v) url.searchParams.set(k, v);
  for (const [k, v] of Object.entries(extra ?? {})) url.searchParams.set(k, v);
  return url.pathname + url.search;
}

/** «Mis rendiciones»: lista paginada, búsqueda y contadores por pestaña. */
export function PaginaMisRendiciones({
  portal,
  pestana,
  searchParams,
}: {
  portal: PortalRendicion;
  pestana: PestanaId;
  searchParams: SearchParams;
}) {
  const base = BASE[portal];
  const def = PESTANAS.find((p) => p.id === pestana) ?? PESTANAS[0];
  return (
    <PaginaPortal
      portal={portal}
      titulo="Rendiciones"
      ruta={`${base}${def.segmento}`}
      cargar={async () => {
        const p = await leerParametros(searchParams);
        const i = portal === "erp" ? await identidadActual() : null;
        const puede = i ? puedeDeIdentidad(i) : () => false;
        const accesos = {
          aprobar: puede("rendiciones:aprobar"),
          pagar: puede("rendiciones:pagar"),
          reporte: puede("rendiciones:ver_todas"),
        };
        try {
          const pagina = await cargarListaPropias(portal, p, def.estado);
          return { pagina, empresa: null, admin: null, accesos, p, base };
        } catch (e) {
          if (!(e instanceof CargaFallida) || e.code !== "FORBIDDEN") throw e;
          return {
            pagina: { items: [], siguiente: null, contadores: {} },
            empresa: (await identidadActual())?.actual?.tenant.nombre ?? "tu empresa",
            admin: await cargarAdministrador(portal),
            accesos,
            p,
            base,
          };
        }
      }}
    >
      {({ pagina, empresa, admin, accesos, p, base: rutaBase }) => {
        if (empresa)
          return (
            <Forbidden
              titulo="No tienes acceso a Rendiciones"
              descripcion={
                admin
                  ? `Necesitas el permiso Rendir. Pídele acceso a ${admin}, administrador de ${empresa}.`
                  : `Necesitas el permiso Rendir. Pídele acceso al administrador de ${empresa}.`
              }
            />
          );
        const nueva = (
          <>
            {accesos.aprobar ? <EnlaceBoton href="/rendiciones/bandeja" variante="secondary">Bandeja del aprobador</EnlaceBoton> : null}
            {accesos.pagar ? <EnlaceBoton href="/rendiciones/lotes" variante="secondary">Lotes de pago</EnlaceBoton> : null}
            {accesos.reporte ? (
              <>
                <EnlaceBoton href="/rendiciones/todas" variante="secondary">
                  Todas las rendiciones
                </EnlaceBoton>
                <EnlaceBoton href="/rendiciones/reporte" variante="secondary">
                  Reporte
                </EnlaceBoton>
              </>
            ) : null}
            <EnlaceBoton href={`${rutaBase}/nueva`} className="hidden md:inline-flex">
              Nueva rendición
            </EnlaceBoton>
          </>
        );
        const flotante = (
          <EnlaceBoton
            href={`${rutaBase}/nueva`}
            className="fixed right-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 shadow-overlay md:hidden"
          >
            Nueva rendición
          </EnlaceBoton>
        );
        const total = Object.values(pagina.contadores ?? {}).reduce(
          (a: number, b) => a + (typeof b === "number" ? b : 0),
          0,
        );
        return (
          <div className="flex flex-col gap-4 pb-24 md:pb-0">
            <Cabecera titulo="Mis rendiciones" acciones={nueva} accionesSiempre />
            <PestanasRendiciones portal={portal} activa={pestana} contadores={pagina.contadores ?? {}} />
            <Buscador placeholder="Buscar por código, motivo o descripción" />
            <ListaRendiciones
              state="ready"
              items={pagina.items}
              portal={portal}
              textos={
                total === 0
                  ? {
                      titulo: "Aún no has rendido gastos",
                      descripcion: "Saca una foto de la boleta y envíala a aprobación.",
                      accion: (
                        <EnlaceBoton href={`${rutaBase}/nueva`} className="md:hidden">
                          Nueva rendición
                        </EnlaceBoton>
                      ),
                    }
                  : {
                      titulo: `No tienes rendiciones ${def.etiqueta.toLowerCase()}`,
                      descripcion: "Aquí aparecerán cuando cambien de estado.",
                    }
              }
            />
            {pagina.siguiente ? (
              <LinkNext
                href={rutaCon(p, `${rutaBase}${def.segmento}`, { cursor: pagina.siguiente })}
                className="t-label px-4 py-3 text-accent"
              >
                Siguiente página
              </LinkNext>
            ) : null}
            {total > 0 ? flotante : null}
          </div>
        );
      }}
    </PaginaPortal>
  );
}