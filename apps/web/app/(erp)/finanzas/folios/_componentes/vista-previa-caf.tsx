import { Badge } from "@opai/ds";

import { fecha } from "@/lib/fechas";

import { foliosUsados, nombreTipoDte } from "./etiquetas-dte";
import type { VistaPreviaCaf } from "./tipos";

export function VistaPreviaCafUi({ vista }: { vista: VistaPreviaCaf }) {
  const usados = foliosUsados(vista);
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-bg p-4">
      <p className="t-label">Vista previa</p>
      {vista.lectura ? <p className="t-body-sm text-fg-muted">{vista.lectura}</p> : null}
      <dl className="grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="t-caption text-fg-muted">Tipo</dt>
          <dd className="t-body-sm">{nombreTipoDte(vista.tipoDte)}</dd>
        </div>
        <div>
          <dt className="t-caption text-fg-muted">Rango</dt>
          <dd className="t-mono t-body-sm">
            {vista.folioDesde} – {vista.folioHasta}
          </dd>
        </div>
        <div>
          <dt className="t-caption text-fg-muted">Disponibles</dt>
          <dd className="t-numeric t-body-sm">{vista.restantes}</dd>
        </div>
        <div>
          <dt className="t-caption text-fg-muted">Usados (inicial)</dt>
          <dd className="t-numeric t-body-sm">{usados}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="t-caption text-fg-muted">Vencimiento CAF</dt>
          <dd className="t-body-sm">{vista.cafVenceEn ? fecha(vista.cafVenceEn) : "—"}</dd>
        </div>
      </dl>
      {vista.alerta ? (
        <Badge tono="warning">Revise avisos de folios bajos o CAF por vencer</Badge>
      ) : (
        <Badge tono="success">Listo para cargar</Badge>
      )}
    </div>
  );
}
