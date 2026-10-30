"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Input, SeccionTarjeta, Select, Switch } from "@opai/ds";
import { GRAVEDADES } from "@opai/domain";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { GRAVEDAD } from "@/app/(erp)/instalaciones/_componentes/rondas/etiquetas";
import type { TipoIncidente } from "@/app/(erp)/instalaciones/_componentes/rondas/tipos";

const OPCIONES = GRAVEDADES.map((g) => ({ valor: g, etiqueta: GRAVEDAD[g] }));

/**
 * Catálogo de tipos de incidente (c15t): agregar, renombrar, cambiar la gravedad por defecto y
 * activar o desactivar con `rondas.incidentes_tipo.crear/actualizar`. Un tipo en uso no se elimina:
 * se desactiva y deja de ofrecerse en novedades nuevas; las ya enviadas lo conservan.
 */
export function EditorTiposIncidente({ tipos }: { tipos: TipoIncidente[] }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [nuevo, setNuevo] = useState("");
  const [grav, setGrav] = useState<string>("media");

  async function agregar() {
    const r = await ejecutar("rondas.incidentes_tipo.crear", {
      nombre: nuevo.trim(),
      gravedadDefecto: grav,
      orden: tipos.length,
      activo: true,
    });
    if (r) {
      avisar.exito("Tipo de incidente agregado");
      setNuevo("");
    }
  }
  const actualizar = (t: TipoIncidente, cambio: Partial<TipoIncidente>) =>
    ejecutar("rondas.incidentes_tipo.actualizar", { id: t.id, ...cambio });

  return (
    <SeccionTarjeta titulo="Tipos de incidente" sinRelleno>
      <p className="t-caption px-4 pt-3">
        Salen como opciones al reportar una novedad en terreno, en este orden. Los inactivos no se
        ofrecen, pero se conservan en las novedades ya enviadas.
      </p>
      {error ? <Alerta tono="danger" titulo={error} className="mx-4 mt-3" /> : null}
      <ul className="flex flex-col">
        {tipos.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2"
          >
            <span className={`min-w-0 flex-1 truncate ${t.activo ? "" : "text-fg-subtle"}`}>
              {t.nombre}
            </span>
            <div className="w-40">
              <Select
                valor={t.gravedadDefecto}
                opciones={OPCIONES}
                onCambiar={(v) => void actualizar(t, { gravedadDefecto: v as TipoIncidente["gravedadDefecto"] })}
              />
            </div>
            <Switch
              soloControl
              etiqueta={`${t.nombre} activo`}
              activo={t.activo}
              disabled={pendiente}
              onCambiar={(activo) => void actualizar(t, { activo })}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 p-4">
        <Input
          aria-label="Nombre del nuevo tipo de incidente"
          placeholder="Nuevo tipo"
          className="min-w-0 flex-1"
          maxLength={80}
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
        />
        <div className="w-40">
          <Select
            valor={grav}
            opciones={OPCIONES}
            onCambiar={setGrav}
          />
        </div>
        <Button variant="secondary" disabled={pendiente || nuevo.trim().length < 2} onClick={() => void agregar()}>
          Agregar
        </Button>
      </div>
    </SeccionTarjeta>
  );
}
