import type { EstadoPantalla } from "@opai/ds";
import dynamic from "next/dynamic";

import { Bloque } from "../bloques";
import { MuestraActividad } from "./actividad";
import { MuestraOverlays } from "./overlays";
import { MuestraSeleccion } from "./seleccion";
import { MuestraSplit } from "./split";

// Fechas, direcciones y mapa se cargan aparte: no pesan en el primer JS de /ds (ADR-037).
const MuestraCampos = dynamic(() => import("./campos").then((m) => m.MuestraCampos));

/** Componentes nuevos del Brief 02 (export de diseño 37 y 38) con sus estados. */
export function BloqueNuevos({ state }: { state: EstadoPantalla }) {
  return (
    <>
      <Bloque titulo="SplitScreen · estados">
        <MuestraSplit state={state} />
      </Bloque>
      <Bloque titulo="Select, Combobox, Checkbox, RadioGroup y Switch">
        <MuestraSeleccion />
      </Bloque>
      <Bloque titulo="Menu, Dialog, Sheet, Popover, Tooltip, Toast y ⌘K">
        <MuestraOverlays />
      </Bloque>
      <Bloque titulo="InputFecha, CampoSecreto, Uploader, CampoDireccion y MapaEstatico">
        <MuestraCampos />
      </Bloque>
      <Bloque titulo="Tabs por ruta, FilaSeleccionable, Vigencia, Timeline y AjustesForm">
        <MuestraActividad />
      </Bloque>
    </>
  );
}
