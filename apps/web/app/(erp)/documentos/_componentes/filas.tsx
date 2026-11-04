import { Badge, type Columna, TipoArchivo, Vigencia } from "@opai/ds";

import { diasHasta } from "@/app/_components/documentos/tipos";
import { fecha } from "@/lib/fechas";

import type { FilaExplorador } from "./datos";
import { FIRMA } from "./etiquetas";

type Etiquetas = Record<string, string>;

const nombre = (d: FilaExplorador) => d.titulo ?? d.nombre;

/** Entidad propietaria: su nombre (si el actor puede leerla) y su tipo; sin nombre, solo el tipo. */
function Vinculo({ d, etiquetas }: { d: FilaExplorador; etiquetas: Etiquetas }) {
  const tipo = d.entidad ? (etiquetas[d.entidad.tipo] ?? d.entidad.tipo) : "—";
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate">{d.entidad?.nombre ?? tipo}</span>
      {d.entidad?.nombre ? <span className="t-caption">{tipo}</span> : null}
    </span>
  );
}

/** Fila-tarjeta del teléfono: archivo, nombre, "vinculado · tipo · firma" y vigencia. */
export function TarjetaDocumento({ d, etiquetas }: { d: FilaExplorador; etiquetas: Etiquetas }) {
  const vinculo = d.entidad?.nombre ?? (d.entidad ? etiquetas[d.entidad.tipo] : null);
  return (
    <>
      <TipoArchivo nombre={d.nombre} mime={d.mime} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-base font-medium text-fg">{nombre(d)}</span>
        <span className="t-caption truncate">
          {[vinculo, d.tipo].filter(Boolean).join(" · ")}
          {d.firma ? ` · Firma ${FIRMA[d.firma]?.etiqueta.toLowerCase()}` : ""}
        </span>
        <Vigencia estado={d.vigencia} dias={diasHasta(d.venceEn)} className="self-start" />
      </span>
    </>
  );
}

/** Columnas de la tabla (md+); Tipo y Subido se ocultan en iPad vertical, como en el diseño. */
export function columnasDe(etiquetas: Etiquetas): Columna<FilaExplorador>[] {
  return [
    {
      id: "documento",
      etiqueta: "Documento",
      render: (d) => (
        <span className="flex items-center gap-2.5">
          <TipoArchivo nombre={d.nombre} mime={d.mime} />
          <span className="font-medium">{nombre(d)}</span>
        </span>
      ),
    },
    {
      id: "vinculo",
      etiqueta: "Vinculado a",
      render: (d) => <Vinculo d={d} etiquetas={etiquetas} />,
    },
    {
      id: "tipo",
      etiqueta: "Tipo",
      render: (d) => d.tipo ?? "—",
      className: "hidden lg:table-cell",
    },
    {
      id: "vigencia",
      etiqueta: "Vigencia",
      render: (d) => (
        <span className="flex flex-col items-start gap-0.5">
          <Vigencia estado={d.vigencia} dias={diasHasta(d.venceEn)} />
          {d.venceEn ? <span className="t-caption t-numeric">{fecha(d.venceEn)}</span> : null}
        </span>
      ),
    },
    {
      id: "firma",
      etiqueta: "Firma",
      render: (d) => {
        const f = d.firma ? FIRMA[d.firma] : null;
        return f ? (
          <Badge tono={f.tono}>{f.etiqueta}</Badge>
        ) : (
          <Badge tono="neutro">Sin firma</Badge>
        );
      },
    },
    {
      id: "fecha",
      etiqueta: "Subido",
      render: (d) => fecha(d.creadoEn),
      className: "hidden t-numeric lg:table-cell",
    },
  ];
}
