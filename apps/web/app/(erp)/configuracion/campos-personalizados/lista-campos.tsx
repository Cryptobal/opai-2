"use client";

import { useState } from "react";

import type { EntidadCampoPersonalizado } from "@opai/domain";
import { Badge, Button, Empty, SeccionTarjeta } from "@opai/ds";

import { EditorCampo } from "./editor-campo";
import { resumenTipo, type CampoConfig, type FichaConfig } from "./tipos-campo";

type Editando =
  { campo: CampoConfig } | { nuevo: EntidadCampoPersonalizado; nombre: string } | null;

function FilaCampo({ c, onEditar }: { c: CampoConfig; onEditar: () => void }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{c.etiqueta}</span>
          {c.obligatorio ? <Badge tono="accent">Obligatorio</Badge> : null}
          {!c.activo ? <Badge>Archivado</Badge> : null}
        </span>
        <span className="t-caption">{resumenTipo(c)}</span>
      </div>
      <Button variant="secondary" onClick={onEditar}>
        Editar
      </Button>
    </li>
  );
}

/** Campos por ficha (solo las de módulos activos), cada grupo con «Nuevo campo» y cada campo con «Editar». */
export function ListaCampos({ campos, fichas }: { campos: CampoConfig[]; fichas: FichaConfig[] }) {
  const [editando, setEditando] = useState<Editando>(null);
  return (
    <div className="flex flex-col gap-4">
      {fichas.map((f) => {
        const propios = campos.filter((c) => c.entidad === f.valor);
        return (
          <SeccionTarjeta
            key={f.valor}
            titulo={f.nombre}
            accion={
              <Button
                variant="secondary"
                onClick={() => setEditando({ nuevo: f.valor, nombre: f.nombre })}
              >
                Nuevo campo
              </Button>
            }
            sinRelleno
          >
            {propios.length === 0 ? (
              <Empty
                titulo={`Sin campos en ${f.nombre.toLowerCase()}`}
                descripcion="Agrega datos propios de tu empresa, por ejemplo rubro, tamaño o fecha de renovación."
              />
            ) : (
              <ul className="divide-y divide-border">
                {propios.map((c) => (
                  <FilaCampo key={c.id} c={c} onEditar={() => setEditando({ campo: c })} />
                ))}
              </ul>
            )}
          </SeccionTarjeta>
        );
      })}
      {editando ? (
        <EditorCampo
          {...("campo" in editando
            ? { campo: editando.campo }
            : { entidad: editando.nuevo, nombreFicha: editando.nombre })}
          onCerrar={() => setEditando(null)}
        />
      ) : null}
    </div>
  );
}
