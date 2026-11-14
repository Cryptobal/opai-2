import { FileText } from "lucide-react";

import { Badge, Empty } from "@opai/ds";
import { formatearFecha } from "@opai/domain";

import { BotonVer } from "./boton-ver";

export type MiDocumento = {
  id: string;
  titulo: string;
  tipo: string | null;
  mime: string;
  tamano: number;
  emitidoEn: string | null;
  venceEn: string | null;
  subidoEn: string;
};

/** «Vence el dd-mm-aaaa» o «Venció el …» según hoy (aaaa-mm-dd de la zona de la empresa). */
function vencimiento(venceEn: string | null, hoy: string): { texto: string; vencido: boolean } | null {
  if (!venceEn) return null;
  const vencido = venceEn < hoy;
  return { texto: `${vencido ? "Venció" : "Vence"} el ${formatearFecha(venceEn)}`, vencido };
}

/**
 * Mis documentos (CAR-463): contrato, anexos y lo que la empresa comparte con el trabajador. Cada fila abre el
 * documento con una URL firmada pedida al tocar «Ver».
 */
export function ListaDocumentos({ items, hoy }: { items: readonly MiDocumento[]; hoy: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="t-title mb-1 text-fg md:hidden">Mis documentos</h2>
        <p className="t-body-sm">Tu contrato, tus anexos y lo que tu empresa comparte contigo.</p>
      </div>
      {items.length === 0 ? (
        <Empty
          titulo="Aún no tienes documentos aquí"
          descripcion="Cuando tu empresa comparta tu contrato o un anexo contigo, aparecerá en esta lista."
        />
      ) : (
        <ul className="-mx-4 divide-y divide-border border-y border-border bg-surface md:mx-0 md:rounded-lg md:border">
          {items.map((d) => {
            const v = vencimiento(d.venceEn, hoy);
            return (
              <li key={d.id} className="flex min-h-11 items-center gap-3 px-4 py-3">
                <FileText aria-hidden className="size-5 flex-none text-fg-subtle" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-medium text-fg">{d.titulo}</span>
                  <span className="t-caption flex flex-wrap items-center gap-x-2 gap-y-1">
                    {d.tipo ? <span>{d.tipo}</span> : null}
                    <span className="t-numeric">{formatearFecha(d.emitidoEn ?? d.subidoEn)}</span>
                    {v ? <Badge tono={v.vencido ? "danger" : "neutro"}>{v.texto}</Badge> : null}
                  </span>
                </span>
                <BotonVer id={d.id} titulo={d.titulo} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
