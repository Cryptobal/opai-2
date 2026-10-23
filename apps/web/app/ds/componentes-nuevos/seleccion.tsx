"use client";

import { useState } from "react";

import { Campo, Checkbox, Combobox, RadioGroup, Switch } from "@opai/ds";

import { SelectMuestra } from "./select-muestra";

const COMUNAS = [
  { valor: "pudahuel", etiqueta: "Pudahuel", detalle: "Región Metropolitana" },
  { valor: "quilicura", etiqueta: "Quilicura", detalle: "Región Metropolitana" },
  { valor: "illapel", etiqueta: "Illapel", detalle: "Coquimbo" },
];
const CARGOS = [
  { valor: "guardia", etiqueta: "Guardia" },
  { valor: "supervisor", etiqueta: "Supervisor" },
  { valor: "cctv", etiqueta: "Operador CCTV" },
];

/** Select, Combobox, Checkbox, RadioGroup y Switch con sus estados. */
export function MuestraSeleccion() {
  const [comuna, setComuna] = useState<string | null>(null);
  const [cargos, setCargos] = useState<string[]>(["guardia", "supervisor"]);
  const [chk, setChk] = useState({ imp: true, trib: false });
  const [jornada, setJornada] = useState("dia");
  const [sw, setSw] = useState(true);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Select · reposo" htmlFor="s1">
          <SelectMuestra id="s1" opciones={["Cliente activo", "Prospecto", "Inactivo"]} />
        </Campo>
        <Campo etiqueta="Select · deshabilitado" htmlFor="s2">
          <SelectMuestra id="s2" opciones={["Cliente activo"]} disabled />
        </Campo>
        <Campo etiqueta="Select · error" htmlFor="s3" error="Elige un estado para continuar">
          <SelectMuestra id="s3" opciones={["Elige un estado"]} invalido />
        </Campo>
        <Campo etiqueta="Combobox · crear" htmlFor="cb1">
          <Combobox
            id="cb1"
            opciones={COMUNAS}
            valor={comuna}
            onCambiar={([v]) => setComuna(v ?? null)}
            onCrear={() => undefined}
            placeholder="Comuna"
          />
        </Campo>
        <Campo etiqueta="Combobox · múltiple" htmlFor="cb2">
          <Combobox
            id="cb2"
            opciones={CARGOS}
            valores={cargos}
            onCambiar={setCargos}
            placeholder="Agregar cargo"
          />
        </Campo>
      </div>
      <div className="flex flex-col gap-2">
        <Checkbox
          etiqueta="Imponible"
          descripcion="Suma a la base de cotización"
          marcado={chk.imp}
          onCambiar={(v) => setChk({ ...chk, imp: v })}
        />
        <Checkbox
          etiqueta="Tributable"
          marcado={chk.trib}
          onCambiar={(v) => setChk({ ...chk, trib: v })}
        />
        <Checkbox etiqueta="Deshabilitado" marcado={false} onCambiar={() => undefined} disabled />
        <Checkbox
          etiqueta="Acepto la política"
          marcado={false}
          onCambiar={() => undefined}
          error="Obligatorio"
        />
        <RadioGroup
          etiqueta="Jornada"
          valor={jornada}
          onCambiar={setJornada}
          opciones={[
            { valor: "dia", etiqueta: "Día" },
            { valor: "noche", etiqueta: "Noche" },
            { valor: "rotativa", etiqueta: "Rotativa" },
            { valor: "x", etiqueta: "Deshabilitado", disabled: true },
          ]}
        />
        <Switch etiqueta="Encendido" activo={sw} onCambiar={setSw} />
        <Switch etiqueta="Deshabilitado" activo={false} onCambiar={() => undefined} disabled />
      </div>
    </div>
  );
}
