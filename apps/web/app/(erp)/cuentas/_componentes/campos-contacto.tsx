"use client";

import { Alerta, Campo, Checkbox, Input, Switch } from "@opai/ds";

import type { Contacto } from "@/lib/tipos-maestros";

import { ROL_CONTACTO } from "./roles-contacto";

export { ROL_CONTACTO } from "./roles-contacto";

export const correoMalo = (e: string) =>
  Boolean(e.trim()) && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

export type DatosContacto = {
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  cargo: string;
  esPrincipal: boolean;
  roles: string[];
};

type Props = {
  d: DatosContacto;
  set: <K extends keyof DatosContacto>(k: K, v: DatosContacto[K]) => void;
  error: string | null;
  principal: Contacto | null;
};

/** Campos del contacto: nombres, correo, teléfono, cargo, principal y roles (03). */
export function CamposContacto({ d, set, error, principal }: Props) {
  return (
    <div className="flex flex-col gap-3.5">
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Nombres" htmlFor="k-nom">
          <Input
            id="k-nom"
            value={d.nombres}
            onChange={(e) => set("nombres", e.target.value)}
            autoFocus
          />
        </Campo>
        <Campo etiqueta="Apellidos" htmlFor="k-ape">
          <Input
            id="k-ape"
            value={d.apellidos}
            onChange={(e) => set("apellidos", e.target.value)}
          />
        </Campo>
      </div>
      <Campo
        etiqueta="Correo"
        htmlFor="k-mail"
        {...(correoMalo(d.email) ? { error: "Falta el dominio, por ejemplo .cl" } : {})}
      >
        <Input
          id="k-mail"
          type="email"
          inputMode="email"
          value={d.email}
          aria-invalid={correoMalo(d.email) || undefined}
          onChange={(e) => set("email", e.target.value)}
        />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Teléfono" htmlFor="k-tel">
          <Input
            id="k-tel"
            type="tel"
            inputMode="tel"
            placeholder="+56 9 1234 5678"
            value={d.telefono}
            onChange={(e) => set("telefono", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Cargo" htmlFor="k-cargo">
          <Input id="k-cargo" value={d.cargo} onChange={(e) => set("cargo", e.target.value)} />
        </Campo>
      </div>
      <div className="border-y border-border">
        <Switch
          etiqueta="Contacto principal"
          {...(principal
            ? {
                descripcion: `Ya existe uno: ${principal.nombres} ${principal.apellidos} pasará a secundario`,
              }
            : {})}
          activo={d.esPrincipal}
          onCambiar={(v) => set("esPrincipal", v)}
        />
      </div>
      <fieldset>
        <legend className="t-label text-fg">Roles</legend>
        {Object.entries(ROL_CONTACTO).map(([id, etiqueta]) => (
          <Checkbox
            key={id}
            etiqueta={etiqueta}
            marcado={d.roles.includes(id)}
            onCambiar={(on) =>
              set("roles", on ? [...d.roles, id] : d.roles.filter((r) => r !== id))
            }
          />
        ))}
      </fieldset>
    </div>
  );
}
