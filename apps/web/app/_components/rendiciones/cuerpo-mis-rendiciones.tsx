import { Cabecera } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { Buscador } from "@/app/_components/maestros/buscador";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { conFiltros } from "@/lib/parametros";

import type { EstadoRendicion, PestanaId, PortalRendicion, ResumenRendicion } from "./tipos";
import { ListaRendiciones } from "./lista";
import { PestanasRendiciones } from "./pestanas";
import { PESTANAS } from "./tipos";

type Accesos = { aprobar: boolean; pagar: boolean; reporte: boolean };
type Pagina = {
  items: ResumenRendicion[];
  siguiente: string | null;
  contadores?: Partial<Record<EstadoRendicion, number>>;
};

export function CuerpoMisRendiciones({
  portal,
  pestana,
  pagina,
  accesos,
  rutaBase,
  segmento,
  p,
}: {
  portal: PortalRendicion;
  pestana: PestanaId;
  pagina: Pagina;
  accesos: Accesos;
  rutaBase: string;
  segmento: string;
  p: Record<string, string | undefined>;
}) {
  const def = PESTANAS.find((x) => x.id === pestana) ?? PESTANAS[0];
  const total = Object.values(pagina.contadores ?? {}).reduce(
    (a: number, b) => a + (typeof b === "number" ? b : 0),
    0,
  );
  const nueva = (
    <>
      {accesos.aprobar ? <EnlaceBoton href="/rendiciones/bandeja" variante="secondary">Bandeja del aprobador</EnlaceBoton> : null}
      {accesos.pagar ? <EnlaceBoton href="/rendiciones/lotes" variante="secondary">Lotes de pago</EnlaceBoton> : null}
      {accesos.reporte ? (
        <>
          <EnlaceBoton href="/rendiciones/todas" variante="secondary">Todas las rendiciones</EnlaceBoton>
          <EnlaceBoton href="/rendiciones/reporte" variante="secondary">Reporte</EnlaceBoton>
        </>
      ) : null}
      <EnlaceBoton href={`${rutaBase}/nueva`} className="hidden md:inline-flex">Nueva rendición</EnlaceBoton>
    </>
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
                accion: <EnlaceBoton href={`${rutaBase}/nueva`} className="md:hidden">Nueva rendición</EnlaceBoton>,
              }
            : {
                titulo: `No tienes rendiciones ${def.etiqueta.toLowerCase()}`,
                descripcion: "Aquí aparecerán cuando cambien de estado.",
              }
        }
      />
      {pagina.siguiente ? (
        <LinkNext
          href={conFiltros(`${rutaBase}${segmento}`, { ...p, cursor: pagina.siguiente })}
          className="t-label px-4 py-3 text-accent"
        >
          Siguiente página
        </LinkNext>
      ) : null}
      {total > 0 ? (
        <EnlaceBoton href={`${rutaBase}/nueva`} className="fixed right-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 shadow-overlay md:hidden">
          Nueva rendición
        </EnlaceBoton>
      ) : null}
    </div>
  );
}