"use client";

import { UserMinus } from "lucide-react";
import { useState } from "react";

import { Avatar, avisar, Badge, Button, Campo, Combobox, Empty } from "@opai/ds";

import { ETIQUETA_ROL } from "@/app/_components/portales";
import { useCapacidad } from "@/app/_components/use-capacidad";

import type { GrupoDetalle, UsuarioEmpresa } from "./tipos";

type Props = {
  grupo: GrupoDetalle;
  usuarios: UsuarioEmpresa[];
  editable: boolean;
  onCambio: () => Promise<void>;
};

/** Miembros del grupo: lista con «Quitar» y selector múltiple para agregar (owner y admin). */
export function MiembrosGrupo({ grupo, usuarios, editable, onCambio }: Props) {
  const { ejecutar, error, pendiente } = useCapacidad("erp");
  const [elegidos, setElegidos] = useState<string[]>([]);
  const dentro = new Set(grupo.miembros.map((m) => m.userId));
  const opciones = usuarios
    .filter((u) => !dentro.has(u.userId))
    .map((u) => ({
      valor: u.userId,
      etiqueta: u.nombre,
      detalle: u.estado === "activa" ? u.email : `${u.email} · suspendido`,
    }));

  async function agregar() {
    const r = await ejecutar("core.grupos.agregar_miembros", {
      grupoId: grupo.id,
      userIds: elegidos,
    });
    if (!r) return;
    setElegidos([]);
    avisar.exito(elegidos.length === 1 ? "Miembro agregado" : "Miembros agregados");
    await onCambio();
  }

  async function quitar(userId: string, nombre: string) {
    if (!(await ejecutar("core.grupos.quitar_miembro", { grupoId: grupo.id, userId }))) return;
    avisar.exito(`${nombre} salió del grupo`);
    await onCambio();
  }

  return (
    <section aria-labelledby="miembros-titulo" className="flex flex-col gap-3">
      <h3 id="miembros-titulo" className="t-label text-fg">
        Miembros ({grupo.miembros.length})
      </h3>
      {error ? <p className="text-sm font-medium text-danger-fg">{error}</p> : null}
      {editable ? (
        <div className="flex flex-col gap-2">
          <Campo etiqueta="Agregar personas" htmlFor="grupo-agregar">
            <Combobox
              id="grupo-agregar"
              opciones={opciones}
              valores={elegidos}
              onCambiar={setElegidos}
              placeholder="Buscar por nombre o correo"
              buscarPlaceholder="Nombre o correo"
              textoInicial="No quedan usuarios de la empresa por agregar."
              disabled={pendiente}
            />
          </Campo>
          <Button className="self-start" disabled={pendiente || !elegidos.length} onClick={agregar}>
            {pendiente
              ? "Guardando…"
              : elegidos.length > 1
                ? `Agregar ${elegidos.length}`
                : "Agregar"}
          </Button>
        </div>
      ) : null}
      {grupo.miembros.length ? (
        <ul aria-label="Miembros del grupo" className="flex flex-col divide-y divide-border">
          {grupo.miembros.map((m) => (
            <li key={m.userId} className="flex min-h-14 items-center gap-3 py-2">
              <Avatar nombre={m.nombre} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-fg">{m.nombre}</span>
                <span className="t-caption truncate">
                  {m.email} · {ETIQUETA_ROL[m.rol] ?? m.rol}
                </span>
              </span>
              {m.estado !== "activa" ? <Badge tono="warning">Suspendido</Badge> : null}
              {editable ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Quitar a ${m.nombre} del grupo`}
                  disabled={pendiente}
                  onClick={() => quitar(m.userId, m.nombre)}
                >
                  <UserMinus className="size-5" aria-hidden />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <Empty
          titulo="Sin miembros"
          descripcion={
            editable
              ? "Agrega a las personas de la empresa que forman este grupo."
              : "Este grupo aún no tiene miembros."
          }
        />
      )}
    </section>
  );
}
