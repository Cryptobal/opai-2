import { Campo, Input, Select, SeccionTarjeta } from "@opai/ds";

import type { ConfigDte } from "./tipos";
import type { FormDte, SetFormDte } from "./use-form-dte";

type Props = { f: FormDte; set: SetFormDte; esOwner: boolean; pendiente: boolean };

/** Secciones «Emisión al SII» y «Cesión y folios» del formulario de configuración DTE. */
export function SeccionesDte({ f, set, esOwner, pendiente }: Props) {
  return (
    <>
      <SeccionTarjeta titulo="Emisión al SII">
        <div className="flex flex-col gap-4">
          <Campo etiqueta="Ambiente SII" htmlFor="dte-ambiente">
            <Select
              id="dte-ambiente"
              valor={f.ambiente}
              disabled={!esOwner || pendiente}
              onCambiar={(v) => set("ambiente", v as ConfigDte["ambiente"])}
              opciones={[
                { valor: "certificacion", etiqueta: "Certificación" },
                { valor: "produccion", etiqueta: "Producción" },
              ]}
            />
          </Campo>
          <Campo etiqueta="RUT emisor" htmlFor="dte-rut">
            <Input
              id="dte-rut"
              value={f.rutEmisor}
              disabled={pendiente}
              onChange={(e) => set("rutEmisor", e.target.value)}
              placeholder="76111222-8"
            />
          </Campo>
          <Campo etiqueta="Conector de emisión" htmlFor="dte-emision">
            <Select
              id="dte-emision"
              valor={f.emisionProveedor}
              disabled={!esOwner || pendiente}
              onCambiar={(v) => set("emisionProveedor", v as ConfigDte["emisionProveedor"])}
              opciones={[
                { valor: "simulado", etiqueta: "Simulado (pruebas)" },
                { valor: "simpleapi", etiqueta: "SimpleAPI (SII real)" },
              ]}
            />
          </Campo>
          <Campo etiqueta="Resolución SII N°" htmlFor="dte-res-n">
            <Input
              id="dte-res-n"
              inputMode="numeric"
              value={f.resolucionNumero}
              disabled={pendiente}
              onChange={(e) => set("resolucionNumero", e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Fecha resolución SII" htmlFor="dte-res-f">
            <Input
              id="dte-res-f"
              type="date"
              value={f.resolucionFecha}
              disabled={pendiente}
              onChange={(e) => set("resolucionFecha", e.target.value)}
            />
          </Campo>
        </div>
      </SeccionTarjeta>
      <SeccionTarjeta titulo="Cesión y folios">
        <div className="flex flex-col gap-4">
          <Campo etiqueta="Cesión (Octava)" htmlFor="dte-cesion">
            <Select
              id="dte-cesion"
              valor={f.cesionProveedor}
              disabled={!esOwner || pendiente}
              onCambiar={(v) => set("cesionProveedor", v)}
              opciones={[
                { valor: "", etiqueta: "Desactivada" },
                { valor: "octava", etiqueta: "Octava" },
              ]}
            />
          </Campo>
          <Campo etiqueta="Aviso folios bajos (%)" htmlFor="dte-umbral">
            <Input
              id="dte-umbral"
              inputMode="numeric"
              value={f.umbral}
              disabled={pendiente}
              onChange={(e) => set("umbral", e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Aviso vencimiento CAF (días)" htmlFor="dte-caf-dias">
            <Input
              id="dte-caf-dias"
              inputMode="numeric"
              value={f.avisoCaf}
              disabled={pendiente}
              onChange={(e) => set("avisoCaf", e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Fecha de corte con OPAI 1.0" htmlFor="dte-corte">
            <Input
              id="dte-corte"
              type="date"
              value={f.fechaCorte}
              disabled={pendiente}
              onChange={(e) => set("fechaCorte", e.target.value)}
            />
          </Campo>
        </div>
      </SeccionTarjeta>
    </>
  );
}
