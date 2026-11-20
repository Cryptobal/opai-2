import { Campo, Input, Switch } from "@opai/ds";
import { RADIO_GEOCERCA_M } from "@opai/domain";

import type { SetCampoPunto } from "./campos-punto-tipos";
import type { DatosPunto } from "./hoja-punto-datos";
import type { DefectosRondas } from "./tipos";

export function CamposCoordenadasPunto({
  d,
  set,
}: {
  d: DatosPunto;
  set: SetCampoPunto;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Campo etiqueta="Latitud" htmlFor="pt-lat">
        <Input
          id="pt-lat"
          value={d.latitud}
          inputMode="decimal"
          placeholder="-33.45"
          onChange={(e) => set("latitud", e.target.value)}
        />
      </Campo>
      <Campo etiqueta="Longitud" htmlFor="pt-lng">
        <Input
          id="pt-lng"
          value={d.longitud}
          inputMode="decimal"
          placeholder="-70.66"
          onChange={(e) => set("longitud", e.target.value)}
        />
      </Campo>
    </div>
  );
}

export function CamposGeocercaPunto({
  d,
  set,
  defectos,
}: {
  d: DatosPunto;
  set: SetCampoPunto;
  defectos: DefectosRondas;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Campo
          etiqueta="Radio (m)"
          htmlFor="pt-radio"
          ayuda={`Hereda ${defectos.radioM} m si lo dejas en blanco · máx. ${RADIO_GEOCERCA_M.max} m`}
        >
          <Input
            id="pt-radio"
            value={d.radioM}
            inputMode="numeric"
            placeholder={String(defectos.radioM)}
            onChange={(e) => set("radioM", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Precisión mín. (m)" htmlFor="pt-prec" ayuda={`Hereda ${defectos.precisionMinM} m`}>
          <Input
            id="pt-prec"
            value={d.precisionMinM}
            inputMode="numeric"
            placeholder={String(defectos.precisionMinM)}
            onChange={(e) => set("precisionMinM", e.target.value)}
          />
        </Campo>
      </div>
      <Switch
        activo={d.estricto}
        onCambiar={(v) => set("estricto", v)}
        etiqueta="Geocerca estricta"
        descripcion="Una marca QR fuera del radio se trata como anomalía."
      />
    </>
  );
}