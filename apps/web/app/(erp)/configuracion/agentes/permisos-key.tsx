"use client";

import { Alerta, Checkbox, Switch } from "@opai/ds";

import { etiquetaPermiso, porModulo } from "./etiqueta-permiso";

export function ModulosKey({
  disponibles,
  elegidos,
  todos,
  onTodos,
  onCambiar,
}: {
  disponibles: string[];
  elegidos: string[];
  todos: boolean;
  onTodos: (todos: boolean) => void;
  onCambiar: (modulos: string[]) => void;
}) {
  return (
    <>
      <Switch
        etiqueta="Todos los módulos"
        descripcion="Incluye los que se activen después"
        activo={todos}
        onCambiar={onTodos}
      />
      {todos ? (
        <Alerta tono="warning" titulo="Acceso a todos los módulos">Esta key podrá operar todos los módulos, incluidos los que se agreguen después. Elige módulos concretos cuando puedas.</Alerta>
      ) : (
        <div className="divide-y divide-border">
          {disponibles.map((s) => (
            <Switch
              key={s}
              etiqueta={s === "core" ? "Núcleo (core)" : s}
              activo={elegidos.includes(s)}
              onCambiar={(on) => onCambiar(on ? [...elegidos, s] : elegidos.filter((m) => m !== s))}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function PermisosKey({
  disponibles,
  elegidos,
  onCambiar,
}: {
  disponibles: string[];
  elegidos: string[];
  onCambiar: (permisos: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="t-caption">
        Solo puedes delegar permisos que tú tienes. Selecciona el mínimo necesario.
      </p>
      {elegidos.length === 0 ? <p className="t-caption text-danger-fg">Elige al menos un permiso.</p> : null}
      {porModulo(disponibles).map((grupo) => (
        <fieldset key={grupo.modulo} className="flex flex-col gap-2">
          <legend className="t-label mb-2">{grupo.moduloLabel}</legend>
          {grupo.ids.map((id) => (
            <Checkbox
              key={id}
              etiqueta={etiquetaPermiso(id).texto}
              descripcion={id}
              marcado={elegidos.includes(id)}
              onCambiar={(on) =>
                onCambiar(on ? [...elegidos, id] : elegidos.filter((p) => p !== id))
              }
            />
          ))}
        </fieldset>
      ))}
    </div>
  );
}
