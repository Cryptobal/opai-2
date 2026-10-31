import { Badge, Empty } from "@opai/ds";

import { pesos } from "@/lib/fechas";

import { type Compra, diaCL, NOMBRE_DTE } from "../../../_componentes/tipos";

/** Últimas compras del proveedor; el pago se vincula cuando exista la conciliación. */
export function ComprasProveedor({ compras }: { compras: Compra[] }) {
  if (compras.length === 0)
    return <Empty titulo="Sin compras registradas" descripcion="Los documentos de este proveedor aparecerán aquí." />;
  return (
    <ul className="flex flex-col">
      {compras.map((c) => (
        <li key={c.id} className="flex items-start gap-3 border-b border-border py-3 last:border-b-0">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium">
              {NOMBRE_DTE[c.tipoDte]} {c.folio}
            </span>
            <span className="text-sm text-fg-muted">
              {diaCL(c.fechaEmision)} · {c.centroCostoNombre ?? "Sin centro de costo"}
            </span>
          </span>
          <span className="flex flex-none flex-col items-end gap-1">
            <span className="t-numeric font-medium">{pesos(c.tipoDte === 61 ? -c.montoTotal : c.montoTotal)}</span>
            <Badge>Sin conciliar</Badge>
          </span>
        </li>
      ))}
    </ul>
  );
}
