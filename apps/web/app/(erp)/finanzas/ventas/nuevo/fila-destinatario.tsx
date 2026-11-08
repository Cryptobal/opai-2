import { Trash2 } from "lucide-react";

import type { DestinatarioDoc, OrigenDestinatario, TipoDestinatario } from "@opai/domain";
import { Badge, Button, Select } from "@opai/ds";

const ORIGEN: Record<OrigenDestinatario, string> = {
  casilla_dte: "Casilla DTE",
  contacto_facturacion: "Facturación",
  manual: "Manual",
};
const TIPOS = (["PARA", "CC", "BCC"] as const).map((t) => ({ valor: t, etiqueta: t }));

/** Un destinatario del correo: correo, de dónde salió, su tipo (PARA/CC/BCC) y quitarlo. */
export function FilaDestinatario({
  d,
  onTipo,
  onQuitar,
}: {
  d: DestinatarioDoc;
  onTipo: (tipo: TipoDestinatario) => void;
  onQuitar: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
      <span className="min-w-0 flex-1 break-all text-sm">{d.email}</span>
      <Badge tono="neutro">{ORIGEN[d.origen]}</Badge>
      <div className="w-28 shrink-0">
        <Select
          aria-label={`Tipo de ${d.email}`}
          valor={d.tipo}
          onCambiar={(v) => onTipo(v as TipoDestinatario)}
          opciones={TIPOS}
        />
      </div>
      <Button variant="ghost" aria-label={`Quitar ${d.email}`} onClick={onQuitar}>
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
