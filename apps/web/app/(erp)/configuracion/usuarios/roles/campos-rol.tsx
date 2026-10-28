"use client";

import { useState } from "react";

import { Campo, Input, Select, Textarea } from "@opai/ds";

import { nombreRol, type RolVista } from "../_permisos/roles";

export type ValoresRol = { nombre: string; descripcion: string; permisos: string[] };

type Props = {
  valores: ValoresRol;
  onCambiar: (v: ValoresRol) => void;
  errorNombre?: string | undefined;
  /** Solo al crear: «Partir de» copia los permisos de otro rol (sin los que no puedes conceder). */
  partirDe?: { roles: RolVista[]; concedibles: string[]; inicial: string | null };
};

const PARTIR_SISTEMA = new Set(["sistema:gerente", "sistema:supervisor", "sistema:viewer"]);

/** Nombre (único), descripción (140) y, al crear, «Partir de» (sábana 07c, A3). */
export function CamposRol({ valores, onCambiar, errorNombre, partirDe }: Props) {
  // Al duplicar, «Partir de» muestra el rol de origen (sus permisos ya vienen cargados).
  const [partir, setPartir] = useState(partirDe?.inicial ?? "blanco");
  const opciones = partirDe
    ? [
        { valor: "blanco", etiqueta: "En blanco" },
        ...partirDe.roles
          .filter((r) => (r.sistema ? PARTIR_SISTEMA.has(r.id) || r.id === partirDe.inicial : true))
          .map((r) => ({ valor: r.id, etiqueta: nombreRol(r) })),
      ]
    : [];
  return (
    <>
      <Campo etiqueta="Nombre del rol" htmlFor="rol-nombre" error={errorNombre}>
        <Input
          id="rol-nombre"
          value={valores.nombre}
          maxLength={60}
          aria-invalid={errorNombre ? true : undefined}
          onChange={(e) => onCambiar({ ...valores, nombre: e.target.value })}
        />
      </Campo>
      <Campo
        etiqueta="Descripción (opcional)"
        htmlFor="rol-descripcion"
        ayuda={`${valores.descripcion.length}/140`}
      >
        <Textarea
          id="rol-descripcion"
          value={valores.descripcion}
          maxLength={140}
          onChange={(e) => onCambiar({ ...valores, descripcion: e.target.value })}
        />
      </Campo>
      {partirDe ? (
        <Campo etiqueta="Partir de" htmlFor="rol-partir">
          <Select
            id="rol-partir"
            valor={partir}
            opciones={opciones}
            onCambiar={(id) => {
              setPartir(id);
              const origen = partirDe.roles.find((r) => r.id === id);
              const puede = new Set(partirDe.concedibles);
              onCambiar({
                ...valores,
                permisos: origen ? origen.permisos.filter((p) => puede.has(p)) : [],
              });
            }}
          />
        </Campo>
      ) : null}
    </>
  );
}
