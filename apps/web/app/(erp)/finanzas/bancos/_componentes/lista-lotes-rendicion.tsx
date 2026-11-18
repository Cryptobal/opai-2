import { Alerta } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { clp } from "../../flujo/_componentes/formato";

export type LoteRendicionSugerido = {
  loteId: string;
  codigoVisible: string;
  totalClp: number;
  fechaPago: string | null;
  referenciaPago: string | null;
  motivo: string;
};

/** Sugerencia informativa: el cargo puede corresponder a un lote de rendiciones pagado (CAR-615). */
export function ListaLotesRendicion({ lotes }: { lotes: readonly LoteRendicionSugerido[] }) {
  if (lotes.length === 0) return null;
  return (
    <Alerta tono="info" titulo="¿Es el pago de rendiciones?">
      <ul className="mt-2 flex flex-col gap-2">
        {lotes.map((l) => (
          <li key={l.loteId} className="text-sm">
            <LinkNext href={`/rendiciones/lotes/${l.loteId}`} className="font-medium text-fg hover:underline">
              {l.codigoVisible}
            </LinkNext>
            {" · "}
            {clp(l.totalClp)}
            {l.fechaPago ? ` · ${l.fechaPago}` : ""}
            {l.referenciaPago ? ` · ref. ${l.referenciaPago}` : ""}
            <span className="block text-fg-muted">{l.motivo}</span>
          </li>
        ))}
      </ul>
    </Alerta>
  );
}