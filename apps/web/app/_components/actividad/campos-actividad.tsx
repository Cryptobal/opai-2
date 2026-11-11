"use client";

import { Campo, Combobox, Input, InputFecha, InputHora, Segmentado, Switch, Textarea } from "@opai/ds";

import type { TipoCompositor } from "@opai/ds";

export type Borrador = {
  texto: string;
  dia: string;
  hora: string;
  tocoFecha: boolean;
  todoElDia: boolean;
  prioridad: "alta" | "media" | "baja";
  responsables: string[];
  asistentes: string;
  acuerdos: string;
  resultado: "contesto" | "no_contesto" | "volver_a_llamar";
  /** El cliente respondió (CAR-160): pausa el seguimiento del negocio. No aplica a tareas. */
  respuestaCliente: boolean;
};

const ETIQUETA_TEXTO: Record<TipoCompositor, string> = {
  nota: "Nota",
  llamada: "Resumen de la llamada",
  reunion: "Resumen",
  tarea: "Qué hay que hacer",
};

type Props = {
  id: string;
  tipo: TipoCompositor;
  b: Borrador;
  cambiar: (c: Partial<Borrador>) => void;
  miembros: { valor: string; etiqueta: string }[];
};

/** Campos del compositor según el tipo (CRM v3, CAR-162). */
export function CamposActividad({ id, tipo, b, cambiar, miembros }: Props) {
  const tarea = tipo === "tarea";
  return (
    <>
      <Campo etiqueta={ETIQUETA_TEXTO[tipo]} htmlFor={`${id}-texto`}>
        <Textarea
          id={`${id}-texto`}
          rows={tarea ? 2 : 3}
          maxLength={4000}
          value={b.texto}
          onChange={(e) => cambiar({ texto: e.target.value })}
        />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta={tarea ? "Vence el" : "Ocurrió el"} htmlFor={`${id}-dia`}>
          <InputFecha
            id={`${id}-dia`}
            valor={b.dia}
            onCambiar={(dia) => cambiar({ dia, tocoFecha: true })}
          />
        </Campo>
        {tarea && b.todoElDia ? null : (
          <Campo etiqueta="Hora" htmlFor={`${id}-hora`}>
            <InputHora
              id={`${id}-hora`}
              valor={b.hora}
              onCambiar={(hora) => cambiar({ hora, tocoFecha: true })}
            />
          </Campo>
        )}
      </div>
      {tarea ? (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <Switch
              etiqueta="Todo el día"
              activo={b.todoElDia}
              onCambiar={(todoElDia) => cambiar({ todoElDia })}
            />
            <span className="flex items-center gap-2">
              <span className="t-caption">Prioridad</span>
              <Segmentado
                etiqueta="Prioridad"
                activa={b.prioridad}
                opciones={(["alta", "media", "baja"] as const).map((p) => ({
                  id: p,
                  etiqueta: p.charAt(0).toUpperCase() + p.slice(1),
                  onClick: () => cambiar({ prioridad: p }),
                }))}
              />
            </span>
          </div>
          {miembros.length ? (
            <Campo etiqueta="Responsables" ayuda="Si no eliges, quedas tú." htmlFor={`${id}-resp`}>
              <Combobox
                id={`${id}-resp`}
                opciones={miembros}
                valores={b.responsables}
                onCambiar={(responsables) => cambiar({ responsables })}
                placeholder="Buscar persona"
              />
            </Campo>
          ) : null}
        </>
      ) : null}
      {tipo === "llamada" ? (
        <span className="flex flex-wrap items-center gap-2">
          <span className="t-caption">Resultado</span>
          <Segmentado
            etiqueta="Resultado de la llamada"
            activa={b.resultado}
            opciones={[
              { id: "contesto", etiqueta: "Contestó" },
              { id: "no_contesto", etiqueta: "No contestó" },
              { id: "volver_a_llamar", etiqueta: "Pidió volver a llamar" },
            ].map((o) => ({
              ...o,
              onClick: () => cambiar({ resultado: o.id as Borrador["resultado"] }),
            }))}
            className="max-w-full overflow-x-auto"
          />
        </span>
      ) : null}
      {tipo === "reunion" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Asistentes" ayuda="Separados por coma." htmlFor={`${id}-asis`}>
            <Input
              id={`${id}-asis`}
              value={b.asistentes}
              maxLength={600}
              onChange={(e) => cambiar({ asistentes: e.target.value })}
            />
          </Campo>
          <Campo etiqueta="Acuerdos" htmlFor={`${id}-acuerdos`}>
            <Input
              id={`${id}-acuerdos`}
              value={b.acuerdos}
              maxLength={4000}
              onChange={(e) => cambiar({ acuerdos: e.target.value })}
            />
          </Campo>
        </div>
      ) : null}
    </>
  );
}
