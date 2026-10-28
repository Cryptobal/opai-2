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
  // "platform" va aparte: "Todos los módulos" nunca lo incluye (ADR-055).
  const plataforma = disponibles.includes("platform");
  const modulos = disponibles.filter((s) => s !== "platform");
  const alternar = (s: string, on: boolean) =>
    onCambiar(on ? [...elegidos, s] : elegidos.filter((m) => m !== s));
  return (
    <>
      <Switch
        etiqueta="Todos los módulos"
        descripcion="Incluye los que se activen después"
        activo={todos}
        onCambiar={onTodos}
      />
      {todos ? (
        <Alerta tono="warning" titulo="Acceso a todos los módulos">
          Esta key podrá operar todos los módulos, incluidos los que se agreguen después. Elige
          módulos concretos cuando puedas.
        </Alerta>
      ) : (
        <div className="divide-y divide-border">
          {modulos.map((s) => (
            <Switch
              key={s}
              etiqueta={s === "core" ? "Núcleo (core)" : s}
              activo={elegidos.includes(s)}
              onCambiar={(on) => alternar(s, on)}
            />
          ))}
        </div>
      )}
      {plataforma ? (
        <Switch
          etiqueta="Plataforma (platform)"
          descripcion="Herramientas platform_*: empresas, módulos y roles de plataforma. Hereda tu rol de plataforma."
          activo={elegidos.includes("platform")}
          onCambiar={(on) => alternar("platform", on)}
        />
      ) : null}
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
      {elegidos.length === 0 ? (
        <p className="t-caption text-danger-fg">Elige al menos un permiso.</p>
      ) : null}
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
