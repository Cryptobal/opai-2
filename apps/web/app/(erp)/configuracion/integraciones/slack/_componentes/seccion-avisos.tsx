"use client";

import { Campo, Input, SeccionTarjeta, Switch } from "@opai/ds";

import type { ConfigSlack } from "./tipos";

type Avisos = ConfigSlack["avisos"];
const AVISOS: { clave: keyof Avisos; etiqueta: string; descripcion: string }[] = [
  {
    clave: "atraso",
    etiqueta: "Atraso",
    descripcion: "Cuando un guardia llega más tarde que el margen.",
  },
  {
    clave: "ausencia",
    etiqueta: "Ausencia",
    descripcion: "Cuando nadie marca el inicio del turno.",
  },
  {
    clave: "fueraDeZona",
    etiqueta: "Fuera de zona",
    descripcion: "Cuando marcan lejos de la instalación.",
  },
  {
    clave: "sinRelevo",
    etiqueta: "Sin relevo",
    descripcion: "Cuando el turno siguiente no llega.",
  },
  {
    clave: "incidentes",
    etiqueta: "Incidentes",
    descripcion: "Cuando se registra un incidente en terreno.",
  },
  {
    clave: "mensajesGuardias",
    etiqueta: "Mensajes de guardias",
    descripcion: "Lo que escriben los guardias desde la app de terreno.",
  },
];

/** Qué se avisa. Las marcaciones normales nunca van a Slack: solo anomalías (ADR-093). */
export function SeccionAvisos(props: {
  avisos: Avisos;
  margen: number;
  resumen: boolean;
  mensajesDirectos: boolean;
  onAvisos: (v: Avisos) => void;
  onMargen: (v: number) => void;
  onResumen: (v: boolean) => void;
  onMensajesDirectos: (v: boolean) => void;
}) {
  const { avisos, margen, resumen } = props;
  return (
    <SeccionTarjeta titulo="Qué se avisa">
      <div className="flex flex-col gap-4">
        <p className="t-caption">
          Las marcaciones normales quedan solo en OPAI. A Slack van las anomalías que actives.
        </p>
        {AVISOS.map(({ clave, etiqueta, descripcion }) => (
          <Switch
            key={clave}
            etiqueta={etiqueta}
            descripcion={descripcion}
            activo={avisos[clave]}
            onCambiar={(v) => props.onAvisos({ ...avisos, [clave]: v })}
          />
        ))}
        <Campo
          etiqueta="Margen de atraso (minutos)"
          htmlFor="slack-margen"
          ayuda="Se avisa desde este atraso. Entre 1 y 240."
        >
          <Input
            id="slack-margen"
            type="number"
            inputMode="numeric"
            min={1}
            max={240}
            value={margen}
            onChange={(e) => props.onMargen(Number(e.target.value))}
          />
        </Campo>
        <Switch
          etiqueta="Resumen por turno y zona"
          descripcion="Un solo mensaje por turno que se actualiza solo, en vez de uno nuevo cada vez."
          activo={resumen}
          onCambiar={props.onResumen}
        />
        <Switch
          etiqueta="Avisos personales por mensaje directo"
          descripcion="Los avisos de OPAI que recibe cada persona en la app también le llegan por mensaje directo en Slack, si está vinculada."
          activo={props.mensajesDirectos}
          onCambiar={props.onMensajesDirectos}
        />
      </div>
    </SeccionTarjeta>
  );
}
