import { FileText } from "lucide-react";

import { Badge, type Columna, ListScreen } from "@opai/ds";
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

function vencimiento(venceEn: string | null, hoy: string): { texto: string; vencido: boolean } | null {
  if (!venceEn) return null;
  const vencido = venceEn < hoy;
  return { texto: `${vencido ? "Venció" : "Vence"} el ${formatearFecha(venceEn)}`, vencido };
}

const COLUMNAS: readonly Columna<MiDocumento>[] = [
  { id: "titulo", etiqueta: "Documento", render: (d) => <span className="font-medium">{d.titulo}</span> },
  { id: "tipo", etiqueta: "Tipo", className: "hidden md:table-cell", render: (d) => d.tipo ?? "—" },
  {
    id: "fecha",
    etiqueta: "Fecha",
    render: (d) => <span className="t-numeric">{formatearFecha(d.emitidoEn ?? d.subidoEn)}</span>,
  },
];

export function ListaDocumentos({
  items,
  hoy,
  hayMas,
}: {
  items: readonly MiDocumento[];
  hoy: string;
  hayMas: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ListScreen
        state="ready"
        titulo="Mis documentos"
        subtitulo="Los documentos que tu empresa comparte contigo, como tu contrato o tus anexos."
        soloTelefono
        items={items}
        clave={(d) => d.id}
        columnas={COLUMNAS}
        tarjeta={(d) => {
          const v = vencimiento(d.venceEn, hoy);
          return (
            <div className="flex w-full items-start gap-3">
              <FileText aria-hidden className="size-5 flex-none text-fg-subtle" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-medium text-fg">{d.titulo}</span>
                <span className="t-caption flex flex-wrap items-center gap-x-2 gap-y-1">
                  {d.tipo ? <span>{d.tipo}</span> : null}
                  <span className="t-numeric">{formatearFecha(d.emitidoEn ?? d.subidoEn)}</span>
                  {v ? <Badge tono={v.vencido ? "danger" : "neutro"}>{v.texto}</Badge> : null}
                </span>
              </span>
            </div>
          );
        }}
        acciones={(d) => <BotonVer id={d.id} titulo={d.titulo} />}
        textos={{
          vacio: {
            titulo: "Aún no tienes documentos aquí",
            descripcion: "Cuando tu empresa comparta tu contrato o un anexo contigo, aparecerá en esta lista.",
          },
        }}
      />
      {hayMas ? <p className="t-caption">Se muestran tus {items.length} documentos más recientes.</p> : null}
    </div>
  );
}