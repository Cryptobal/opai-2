"use client";

import { Campo, Input, SeccionTarjeta, Select, Switch } from "@opai/ds";

import type { ConfigSlack, Grupo } from "./tipos";

type Panico = ConfigSlack["panico"];

/** Pánico y su escalamiento a un grupo de usuarios de OPAI (decisión de Carlos, 11-nov-2026). */
export function SeccionPanico({
  panico,
  grupos,
  onCambiar,
}: {
  panico: Panico;
  grupos: Grupo[];
  onCambiar: (v: Panico) => void;
}) {
  const set = (cambio: Partial<Panico>) => onCambiar({ ...panico, ...cambio });
  const vigentes = grupos.filter((g) => !g.archivado);
  return (
    <SeccionTarjeta titulo="Pánico">
      <div className="flex flex-col gap-4">
        <Switch
          etiqueta="Avisar en el canal"
          descripcion="El pánico del guardia llega al canal con su ubicación y el botón «Tomar»."
          activo={panico.alCanal}
          onCambiar={(v) => set({ alCanal: v })}
        />
        <Switch
          etiqueta="Mensaje directo al supervisor de la zona"
          descripcion="Además del canal, le llega un mensaje personal."
          activo={panico.mensajeDirectoSupervisor}
          onCambiar={(v) => set({ mensajeDirectoSupervisor: v })}
        />
        <Switch
          etiqueta="Escalar si nadie lo toma"
          descripcion="Avisa a un grupo de usuarios cuando pasa el tiempo sin que nadie tome el pánico."
          activo={panico.escalar}
          onCambiar={(v) => set({ escalar: v })}
        />
        {panico.escalar ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Campo
              etiqueta="Minutos antes de escalar"
              htmlFor="slack-escalar-min"
              ayuda="Entre 1 y 60."
            >
              <Input
                id="slack-escalar-min"
                type="number"
                inputMode="numeric"
                min={1}
                max={60}
                value={panico.escalarMinutos}
                onChange={(e) => set({ escalarMinutos: Number(e.target.value) })}
              />
            </Campo>
            <Campo
              etiqueta="Grupo que recibe el escalamiento"
              htmlFor="slack-escalar-grupo"
              {...(vigentes.length
                ? {}
                : { ayuda: "Crea primero un grupo en Configuración › Usuarios › Grupos." })}
            >
              <Select
                id="slack-escalar-grupo"
                aria-label="Grupo que recibe el escalamiento"
                valor={panico.escalarAGrupoId ?? undefined}
                placeholder="Elige un grupo"
                disabled={!vigentes.length}
                opciones={vigentes.map((g) => ({ valor: g.id, etiqueta: g.nombre }))}
                onCambiar={(id) => set({ escalarAGrupoId: id })}
              />
            </Campo>
          </div>
        ) : null}
      </div>
    </SeccionTarjeta>
  );
}
