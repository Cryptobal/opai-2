"use client";

import { Input, Textarea } from "../components/input";
import { InputFecha } from "../components/input-fecha";
import { Select } from "../components/select";
import { Switch } from "../components/switch";
import { ControlJson } from "./ajustes-control-json";

export type CampoAjusteVista = {
  modulo: string;
  clave: string;
  etiqueta: string;
  ayuda: string | null;
  grupo: string | null;
  ambito: "tenant" | "usuario" | "plataforma";
  control: string | null;
  editable: boolean;
  esquema: Record<string, unknown>;
};

export type PropsCampo = {
  campo: CampoAjusteVista;
  valor: unknown;
  origen: string;
  modificado: boolean;
  onCambiar: (v: unknown) => void;
  onRestablecer?: () => void;
};

/** Control según `control` del esquema o, si falta, según el tipo del JSON Schema. */
export function controlDe(c: CampoAjusteVista): string {
  if (c.control) return c.control;
  const t = c.esquema.type;
  if (Array.isArray(c.esquema.enum)) return "seleccion";
  if (t === "boolean") return "switch";
  if (t === "number" || t === "integer") return "numero";
  if (t === "array") return "lista";
  return "texto";
}

export function Control({ campo, valor, onCambiar, id }: PropsCampo & { id: string }) {
  const tipo = controlDe(campo);
  const deshabilitado = !campo.editable;
  if (tipo === "switch")
    return (
      <Switch
        soloControl
        etiqueta={campo.etiqueta}
        activo={valor === true}
        disabled={deshabilitado}
        onCambiar={onCambiar}
      />
    );
  if (tipo === "seleccion") {
    const opciones = ((campo.esquema.enum as unknown[]) ?? []).map((v) => ({
      valor: String(v),
      etiqueta: String(v),
    }));
    return (
      <Select
        id={id}
        valor={valor == null ? undefined : String(valor)}
        opciones={opciones}
        disabled={deshabilitado}
        onCambiar={onCambiar}
      />
    );
  }
  if (tipo === "numero")
    return (
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        value={valor == null ? "" : String(valor)}
        disabled={deshabilitado}
        onChange={(e) => onCambiar(e.target.value === "" ? null : Number(e.target.value))}
        className="md:w-40"
      />
    );
  if (tipo === "fecha")
    return (
      <InputFecha
        id={id}
        valor={typeof valor === "string" ? valor : ""}
        onCambiar={onCambiar}
        disabled={deshabilitado}
      />
    );
  if (tipo === "json") return <ControlJson id={id} valor={valor} disabled={deshabilitado} onCambiar={onCambiar} />;
  if (tipo === "lista")
    return (
      <Textarea
        id={id}
        value={Array.isArray(valor) ? valor.join("\n") : ""}
        disabled={deshabilitado}
        onChange={(e) =>
          onCambiar(
            e.target.value
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
      />
    );
  return (
    <Input
      id={id}
      type={tipo === "color" ? "color" : "text"}
      value={typeof valor === "string" ? valor : ""}
      disabled={deshabilitado}
      onChange={(e) => onCambiar(e.target.value)}
      className={tipo === "color" ? "w-20 p-1" : undefined}
    />
  );
}
