"use client";

import { Alerta, Campo, type OpcionSelect, SeccionTarjeta, Select, Skeleton } from "@opai/ds";

import type { Canal, ConfigSlack } from "./tipos";

type Clave = keyof ConfigSlack["canales"];
const NINGUNO = "__general__";
const CAMPOS: { clave: Clave; etiqueta: string; ayuda: string }[] = [
  {
    clave: "general",
    etiqueta: "Canal de anomalías",
    ayuda: "Atrasos, ausencias y demás avisos de terreno.",
  },
  {
    clave: "panico",
    etiqueta: "Canal del pánico",
    ayuda: "Si no eliges uno, el pánico va al canal de anomalías.",
  },
  {
    clave: "resumen",
    etiqueta: "Canal del resumen",
    ayuda: "Si no eliges uno, el resumen va al canal de anomalías.",
  },
];

/** Pocos canales, nunca uno por instalación (ADR-093). Solo canales públicos del espacio conectado. */
export function SeccionCanales(props: {
  conectada: boolean;
  canales: Canal[] | null;
  valor: ConfigSlack["canales"];
  onCambiar: (v: ConfigSlack["canales"]) => void;
}) {
  const { conectada, canales, valor, onCambiar } = props;
  if (!conectada) {
    return (
      <SeccionTarjeta titulo="Canales">
        <p className="t-body-sm text-fg-muted">
          Conecta Slack para elegir a qué canales van los avisos.
        </p>
      </SeccionTarjeta>
    );
  }
  if (!canales) {
    return (
      <SeccionTarjeta titulo="Canales">
        <Skeleton className="h-10 w-full" />
      </SeccionTarjeta>
    );
  }
  const opciones: OpcionSelect[] = canales.map((c) => ({
    valor: c.id,
    etiqueta: `#${c.nombre}`,
    ...(c.esMiembro ? {} : { descripcion: "Falta invitar a la app «OPAI»" }),
  }));
  const fuera = CAMPOS.map((c) => valor[c.clave]).filter(
    (c) => c && !canales.find((x) => x.id === c.id)?.esMiembro,
  );
  return (
    <SeccionTarjeta titulo="Canales">
      <div className="flex flex-col gap-4">
        {CAMPOS.map(({ clave, etiqueta, ayuda }) => (
          <Campo key={clave} etiqueta={etiqueta} ayuda={ayuda} htmlFor={`slack-canal-${clave}`}>
            <Select
              id={`slack-canal-${clave}`}
              aria-label={etiqueta}
              valor={valor[clave]?.id ?? (clave === "general" ? undefined : NINGUNO)}
              placeholder="Elige un canal"
              opciones={
                clave === "general"
                  ? opciones
                  : [{ valor: NINGUNO, etiqueta: "Usar el canal de anomalías" }, ...opciones]
              }
              onCambiar={(id) => {
                const c = canales.find((x) => x.id === id);
                onCambiar({ ...valor, [clave]: c ? { id: c.id, nombre: c.nombre } : null });
              }}
            />
          </Campo>
        ))}
        {fuera.length ? (
          <Alerta tono="warning" titulo="Invita a la app «OPAI» a los canales elegidos">
            <p className="t-body-sm">
              En Slack, escribe /invite @OPAI en cada canal. Sin eso, los avisos no llegan.
            </p>
          </Alerta>
        ) : null}
      </div>
    </SeccionTarjeta>
  );
}
