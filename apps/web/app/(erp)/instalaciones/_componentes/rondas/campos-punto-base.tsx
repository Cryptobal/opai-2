import { Campo, Input, RadioGroup, Switch, Textarea } from "@opai/ds";
import { type ModoPunto, MODOS_PUNTO } from "@opai/domain";

import { MODO_PUNTO } from "./etiquetas";
import type { SetCampoPunto } from "./campos-punto-tipos";
import type { DatosPunto } from "./hoja-punto-datos";
import type { DefectosRondas } from "./tipos";

export function CamposPuntoBase({
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
      <Campo etiqueta="Nombre del punto" htmlFor="pt-nombre">
        <Input
          id="pt-nombre"
          value={d.nombre}
          placeholder="Portería principal"
          onChange={(e) => set("nombre", e.target.value)}
        />
      </Campo>
      <Campo etiqueta="Instrucción para el guardia" htmlFor="pt-instr">
        <Textarea
          id="pt-instr"
          value={d.instrucciones}
          rows={2}
          placeholder="Qué revisar en este punto"
          onChange={(e) => set("instrucciones", e.target.value)}
        />
      </Campo>
      <RadioGroup
        etiqueta="Modo de verificación"
        orientacion="fila"
        valor={d.modo}
        onCambiar={(v) => set("modo", v as ModoPunto)}
        opciones={MODOS_PUNTO.map((m) => ({ valor: m, etiqueta: MODO_PUNTO[m] }))}
      />
      <p className="t-caption -mt-2">Por defecto en la empresa: {MODO_PUNTO[defectos.modo]}.</p>
      <Campo etiqueta="Permanencia (s)" htmlFor="pt-perm" ayuda={`Hereda ${defectos.permanenciaGpsS} s`}>
        <Input
          id="pt-perm"
          value={d.permanenciaS}
          inputMode="numeric"
          placeholder={String(defectos.permanenciaGpsS)}
          onChange={(e) => set("permanenciaS", e.target.value)}
        />
      </Campo>
      <Switch
        activo={d.exigeFoto}
        onCambiar={(v) => set("exigeFoto", v)}
        etiqueta="Pedir foto al marcar"
        descripcion="El guardia adjunta una foto al confirmar el punto."
      />
    </>
  );
}