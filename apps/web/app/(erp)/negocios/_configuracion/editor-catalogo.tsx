"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Input, SeccionTarjeta, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { ItemCatalogo } from "../_componentes/hojas/tipos";

type Props = {
  catalogo: "tipo" | "origen" | "motivo";
  titulo: string;
  descripcion: string;
  items: ItemCatalogo[];
};

/**
 * Un catálogo de Comercial: agregar, renombrar y activar o desactivar cada valor con
 * `comercial.config.guardar_catalogo` (un valor en uso no se elimina: se desactiva).
 */
export function EditorCatalogo({ catalogo, titulo, descripcion, items }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [nuevo, setNuevo] = useState("");
  const [editando, setEditando] = useState<{ id: string; nombre: string } | null>(null);
  const guardar = (item: Partial<ItemCatalogo> & { nombre: string }) =>
    ejecutar("comercial.config.guardar_catalogo", {
      catalogo,
      ...item,
      orden: item.orden ?? items.length,
    });
  async function agregar() {
    if (await guardar({ nombre: nuevo.trim(), activo: true })) {
      avisar.exito("Valor agregado");
      setNuevo("");
    }
  }
  async function renombrar(i: ItemCatalogo) {
    if (!editando) return;
    if (await guardar({ ...i, nombre: editando.nombre.trim() })) {
      avisar.exito("Valor renombrado");
      setEditando(null);
    }
  }
  return (
    <SeccionTarjeta titulo={titulo} sinRelleno>
      <p className="t-caption px-4 pt-3">{descripcion}</p>
      {error ? <Alerta tono="danger" titulo={error} className="mx-4 mt-3" /> : null}
      <ul className="flex flex-col">
        {items.map((i) => (
          <li
            key={i.id}
            className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-1.5"
          >
            {editando?.id === i.id ? (
              <>
                <Input
                  aria-label={`Nuevo nombre de ${i.nombre}`}
                  className="min-w-0 flex-1"
                  maxLength={80}
                  value={editando.nombre}
                  onChange={(e) => setEditando({ id: i.id, nombre: e.target.value })}
                />
                <Button
                  disabled={pendiente || editando.nombre.trim().length < 2}
                  onClick={() => void renombrar(i)}
                >
                  Guardar
                </Button>
                <Button variant="ghost" onClick={() => setEditando(null)}>
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <span className={`min-w-0 flex-1 truncate ${i.activo ? "" : "text-fg-subtle"}`}>
                  {i.nombre}
                </span>
                <Button variant="ghost" onClick={() => setEditando({ id: i.id, nombre: i.nombre })}>
                  Renombrar
                </Button>
                <Switch
                  soloControl
                  etiqueta={`${i.nombre} activo`}
                  activo={i.activo}
                  disabled={pendiente}
                  onCambiar={(activo) => void guardar({ ...i, activo })}
                />
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-2 p-4">
        <Input
          aria-label={`Agregar a ${titulo.toLowerCase()}`}
          placeholder="Nuevo valor"
          className="min-w-0 flex-1"
          maxLength={80}
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
        />
        <Button
          variant="secondary"
          disabled={pendiente || nuevo.trim().length < 2}
          onClick={() => void agregar()}
        >
          Agregar
        </Button>
      </div>
    </SeccionTarjeta>
  );
}
