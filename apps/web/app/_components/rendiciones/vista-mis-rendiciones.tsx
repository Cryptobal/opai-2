import { Cabecera, Forbidden } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginacionCursor } from "@/app/_components/maestros/paginacion-cursor";

import { ListaRendiciones } from "./lista";
import { PestanasRendiciones } from "./pestanas";
import { BASE, PESTANAS, type PestanaId, type PortalRendicion } from "./tipos";
import type { cargarAdministrador, cargarContadoresPestanas, cargarMias } from "./datos";
import type { Parametros } from "@/lib/parametros";

type Pagina = Awaited<ReturnType<typeof cargarMias>>;
type Contadores = Awaited<ReturnType<typeof cargarContadoresPestanas>>;
type Admin = Awaited<ReturnType<typeof cargarAdministrador>>;

export function VistaMisRendiciones({
  portal,
  pestana,
  pagina,
  contadores,
  p,
  empresa,
  admin,
  accesos,
}: {
  portal: PortalRendicion;
  pestana: PestanaId;
  pagina: Pagina;
  contadores: Contadores;
  p: Parametros;
  empresa: string | null;
  admin: Admin;
  accesos: { aprobar: boolean; pagar: boolean; reporte: boolean };
}) {
  const base = BASE[portal];
  const def = PESTANAS.find((x) => x.id === pestana) ?? PESTANAS[0];
  if (empresa) {
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
  }
  const items = pagina.rendiciones;
  const todas = contadores;
  const nueva = (
    <>
      {accesos.aprobar ? (
        <EnlaceBoton href="/rendiciones/bandeja" variante="secondary">
          Bandeja del aprobador
        </EnlaceBoton>
      ) : null}
      {accesos.pagar ? (
        <EnlaceBoton href="/rendiciones/lotes" variante="secondary">
          Lotes de pago
        </EnlaceBoton>
      ) : null}
      {accesos.reporte ? (
        <EnlaceBoton href="/rendiciones/reporte" variante="secondary">
          Reporte
        </EnlaceBoton>
      ) : null}
      <EnlaceBoton href={`${base}/nueva`} className="hidden md:inline-flex">
        Nueva rendición
      </EnlaceBoton>
    </>
  );
  const flotante = (
    <EnlaceBoton
      href={`${base}/nueva`}
      className="fixed right-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 shadow-overlay md:hidden"
    >
      Nueva rendición
    </EnlaceBoton>
  );
  return (
    <div className="flex flex-col gap-4 pb-24 md:pb-0">
      <Cabecera titulo="Mis rendiciones" acciones={nueva} accionesSiempre />
      <PestanasRendiciones portal={portal} activa={pestana} rendiciones={todas} />
      <ListaRendiciones
        state="ready"
        items={items}
        portal={portal}
        pie={
          <div className="flex justify-end border-t border-border px-4 py-3">
            <PaginacionCursor p={p} mostrados={items.length} siguiente={pagina.siguiente} total={null} />
          </div>
        }
        textos={
          contadores.length === 0
            ? {
                titulo: "Aún no has rendido gastos",
                descripcion: "Saca una foto de la boleta y envíala a aprobación.",
                accion: (
                  <EnlaceBoton href={`${base}/nueva`} className="md:hidden">
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
      {todas.length > 0 ? flotante : null}
    </div>
  );
}