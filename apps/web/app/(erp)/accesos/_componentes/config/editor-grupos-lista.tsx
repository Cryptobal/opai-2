"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Checkbox, Input, SeccionTarjeta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

export type GrupoLista = { id?: string; nombre: string; instalacionIds: string[] };
export type InstalacionOpcion = { id: string; nombre: string };

/** Grupos de instalaciones que comparten listas (CAR-506), en configuración de empresa. */
export function EditorGruposLista({
  grupos: iniciales,
  instalaciones,
}: {
  grupos: GrupoLista[];
  instalaciones: InstalacionOpcion[];
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [gs, setGs] = useState(iniciales);

  async function guardar() {
    const payload = gs.map((g) => ({
      ...(g.id ? { id: g.id } : {}),
      nombre: g.nombre.trim(),
      instalacionIds: g.instalacionIds,
    }));
    const r = await ejecutar<GrupoLista[]>("acceso.grupos.set", { grupos: payload });
    if (!r) return;
    setGs(
      r.map((g) => ({
        ...(g.id ? { id: g.id } : {}),
        nombre: g.nombre,
        instalacionIds: g.instalacionIds,
      })),
    );
    avisar.exito("Grupos de listas guardados");
  }

  return (
    <SeccionTarjeta titulo="Grupos de instalaciones" sinRelleno>
      <p className="t-caption px-4 pt-3">
        Una lista con alcance «grupo» aplica a todas las instalaciones del grupo. Arma los grupos aquí
        y luego elige ese alcance al agregar o importar entradas.
      </p>
      {error ? <Alerta tono="danger" titulo={error} className="mx-4 mt-3" /> : null}
      <ul className="flex flex-col">
        {gs.map((g, i) => (
          <FilaGrupo
            key={g.id ?? `n${i}`}
            g={g}
            instalaciones={instalaciones}
            cambiar={(x) => setGs((v) => v.map((row, j) => (j === i ? { ...row, ...x } : row)))}
            quitar={() => setGs((v) => v.filter((_, j) => j !== i))}
          />
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 p-4">
        <Button
          variant="secondary"
          disabled={gs.length >= 30}
          onClick={() => setGs((v) => [...v, { nombre: "", instalacionIds: [] }])}
        >
          Agregar grupo
        </Button>
        <Button
          disabled={
            pendiente || gs.some((g) => g.nombre.trim().length < 2 || g.instalacionIds.length === 0)
          }
          onClick={() => void guardar()}
        >
          {pendiente ? "Guardando…" : "Guardar grupos"}
        </Button>
      </div>
    </SeccionTarjeta>
  );
}

function FilaGrupo({
  g,
  instalaciones,
  cambiar,
  quitar,
}: {
  g: GrupoLista;
  instalaciones: InstalacionOpcion[];
  cambiar: (x: Partial<GrupoLista>) => void;
  quitar: () => void;
}) {
  const toggle = (id: string) => {
    const tiene = g.instalacionIds.includes(id);
    cambiar({
      instalacionIds: tiene ? g.instalacionIds.filter((x) => x !== id) : [...g.instalacionIds, id],
    });
  };
  return (
    <li className="flex flex-col gap-2 border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Nombre del grupo"
          className="min-w-0 flex-1"
          maxLength={80}
          placeholder="Por ejemplo «Zona norte»"
          value={g.nombre}
          onChange={(e) => cambiar({ nombre: e.target.value })}
        />
        <Button variant="ghost" onClick={quitar}>
          Quitar
        </Button>
      </div>
      <fieldset className="flex flex-wrap gap-x-4 gap-y-2 border-0 p-0">
        <legend className="sr-only">Instalaciones del grupo</legend>
        {instalaciones.map((i) => (
          <Checkbox
            key={i.id}
            etiqueta={i.nombre}
            marcado={g.instalacionIds.includes(i.id)}
            onCambiar={() => toggle(i.id)}
          />
        ))}
      </fieldset>
      {g.instalacionIds.length === 0 ? (
        <p className="t-caption text-fg-muted">Elige al menos una instalación.</p>
      ) : null}
    </li>
  );
}