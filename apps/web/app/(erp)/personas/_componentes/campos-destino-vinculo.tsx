"use client";

import { Campo, Input, Select } from "@opai/ds";

export type DestinoVinculo = {
  instalacionId: string;
  puestoId: string;
  horasSemanales: string;
  distribucion: string;
};
export type OpcionesDestino = {
  instalaciones: { id: string; nombre: string }[];
  puestos: { id: string; nombre: string; instalacionId: string }[];
};
export function CamposDestinoVinculo({
  v,
  onCambiar,
  instalaciones,
  puestos,
}: OpcionesDestino & {
  v: DestinoVinculo;
  onCambiar: (v: DestinoVinculo) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3.5">
      <legend className="mb-2 t-label">Instalación y jornada pactada</legend>
      <Campo etiqueta="Instalación obligatoria" htmlFor="v-instalacion">
        <Select
          id="v-instalacion"
          valor={v.instalacionId}
          placeholder="Elegir instalación"
          opciones={instalaciones.map((i) => ({ valor: i.id, etiqueta: i.nombre }))}
          onCambiar={(instalacionId) => onCambiar({ ...v, instalacionId, puestoId: "" })}
        />
      </Campo>
      <Campo etiqueta="Puesto (opcional)" htmlFor="v-puesto">
        <Select
          id="v-puesto"
          valor={v.puestoId || "sin"}
          opciones={[
            { valor: "sin", etiqueta: "Sin puesto" },
            ...puestos
              .filter((p) => p.instalacionId === v.instalacionId)
              .map((p) => ({ valor: p.id, etiqueta: p.nombre })),
          ]}
          onCambiar={(puestoId) =>
            onCambiar({ ...v, puestoId: puestoId === "sin" ? "" : puestoId })
          }
        />
      </Campo>
      <Campo
        etiqueta="Horas semanales"
        htmlFor="v-horas"
        ayuda="Horas pactadas en el contrato, sin inferirlas del puesto."
        {...(v.horasSemanales &&
        (!/^\d+$/.test(v.horasSemanales) ||
          Number(v.horasSemanales) < 1 ||
          Number(v.horasSemanales) > 168)
          ? { error: "Ingresa horas enteras entre 1 y 168" }
          : {})}
      >
        <Input
          id="v-horas"
          inputMode="numeric"
          value={v.horasSemanales}
          onChange={(e) => onCambiar({ ...v, horasSemanales: e.target.value })}
        />
      </Campo>
      <Campo
        etiqueta="Distribución"
        htmlFor="v-distribucion"
        ayuda="Por ejemplo: lunes a viernes o 4×4."
      >
        <Input
          id="v-distribucion"
          maxLength={200}
          value={v.distribucion}
          onChange={(e) => onCambiar({ ...v, distribucion: e.target.value })}
        />
      </Campo>
      <p className="t-caption">PIN y Face ID siguen en Asistencia.</p>
    </fieldset>
  );
}
