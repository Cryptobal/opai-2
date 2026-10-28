"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { useParametros } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { nombreRol, type RolVista } from "../_permisos/roles";
import { MatrizPermisos } from "../_permisos/matriz-permisos";
import { AccionesRol } from "./archivar-rol";
import { CamposRol, type ValoresRol } from "./campos-rol";
import type { PropsHojas } from "./hojas-rol";

type Props = PropsHojas & {
  /** Rol abierto; null = nuevo rol. */
  rol: RolVista | null;
  /** Al crear: rol a duplicar (nombre y permisos de partida). */
  base: RolVista | null;
  onCerrar: () => void;
};

const iniciales = (r: RolVista | null, base: RolVista | null, puede: string[]): ValoresRol => {
  if (r) return { nombre: r.nombre, descripcion: r.descripcion ?? "", permisos: r.permisos };
  if (!base) return { nombre: "", descripcion: "", permisos: [] };
  const ok = new Set(puede);
  return {
    nombre: `${nombreRol(base)} (copia)`,
    descripcion: base.descripcion ?? "",
    permisos: base.permisos.filter((p) => ok.has(p)),
  };
};

function contarCambios(a: ValoresRol, b: ValoresRol): number {
  const pa = new Set(a.permisos);
  const pb = new Set(b.permisos);
  const permisos =
    [...pa].filter((p) => !pb.has(p)).length + [...pb].filter((p) => !pa.has(p)).length;
  // Nombre y descripción normalizados como los guarda el servidor (trim): «Rol » no queda pendiente.
  return (
    permisos +
    Number(a.nombre.trim() !== b.nombre.trim()) +
    Number(a.descripcion.trim() !== b.descripcion.trim())
  );
}

/** Detalle, edición y alta de un rol (sábana 07c, A2/A3): Sheet desde 1024, pantalla completa en teléfono. */
export function HojaRol({ rol, base, roles, catalogo, concedibles, gestiona, onCerrar }: Props) {
  const { ejecutar, error, pendiente, limpiarError } = useCapacidad("erp");
  const { fijar } = useParametros();
  const origen = iniciales(rol, base, concedibles);
  const [v, setV] = useState<ValoresRol>(origen);
  const editable = gestiona && !rol?.sistema;
  const cambios = rol ? contarCambios(origen, v) : 0;
  const duplicado = error?.includes("Ya existe") ? "Ya existe un rol con ese nombre" : undefined;

  async function guardar() {
    const datos = {
      nombre: v.nombre.trim(),
      descripcion: v.descripcion.trim() || null,
      permisos: v.permisos,
    };
    if (!rol) {
      const r = await ejecutar<RolVista>("core.roles.create", datos);
      if (!r) return;
      avisar.exito("Rol creado");
      fijar({ nuevo: null, rol: r.id });
      return;
    }
    if (await ejecutar("core.roles.update", { id: rol.id, ...datos }))
      avisar.exito("Rol actualizado");
  }

  const acciones = !editable ? (
    rol?.sistema && gestiona ? (
      <Button block size="lg" onClick={() => fijar({ rol: null, nuevo: rol.id })}>
        Duplicar como nuevo rol
      </Button>
    ) : undefined
  ) : (
    <>
      {cambios > 0 ? (
        <span className="t-caption self-center" aria-live="polite">
          {cambios === 1 ? "1 cambio sin guardar" : `${cambios} cambios sin guardar`}
        </span>
      ) : null}
      <Button
        variant="secondary"
        size="lg"
        onClick={() => (rol ? (setV(origen), limpiarError()) : onCerrar())}
      >
        {rol ? "Descartar" : "Cancelar"}
      </Button>
      <Button
        size="lg"
        className="flex-1"
        disabled={pendiente || v.nombre.trim().length < 2 || (rol !== null && cambios === 0)}
        onClick={guardar}
      >
        {pendiente ? "Guardando…" : rol ? "Guardar cambios" : "Crear rol"}
      </Button>
    </>
  );

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      telefono="completo"
      titulo={rol ? nombreRol(rol) : "Nuevo rol"}
      {...(rol?.descripcion ? { descripcion: rol.descripcion } : {})}
      {...(acciones ? { acciones } : {})}
    >
      <fieldset disabled={pendiente} className="flex flex-col gap-4">
        {rol ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-fg-muted">
              {rol.usuarios === 1 ? "Lo tiene 1 usuario" : `Lo tienen ${rol.usuarios} usuarios`}
            </p>
            {editable ? (
              <AccionesRol
                rol={rol}
                onDuplicar={() => fijar({ rol: null, nuevo: rol.id })}
                onArchivado={onCerrar}
              />
            ) : null}
          </div>
        ) : null}
        {rol?.sistema ? (
          <Alerta tono="info" titulo="Los roles del sistema no se editan">
            {gestiona ? "Puedes duplicarlo como nuevo rol." : null}
          </Alerta>
        ) : null}
        {error && !duplicado ? (
          <Alerta tono="danger" titulo="No se guardaron los cambios. Inténtalo de nuevo.">
            {error}
          </Alerta>
        ) : null}
        {editable ? (
          <CamposRol
            valores={v}
            onCambiar={setV}
            errorNombre={duplicado}
            {...(rol ? {} : { partirDe: { roles, concedibles, inicial: base?.id ?? null } })}
          />
        ) : null}
        <h3 className="t-label text-fg">Permisos</h3>
        <MatrizPermisos
          catalogo={catalogo}
          valor={v.permisos}
          concedibles={concedibles}
          {...(editable ? { onCambiar: (permisos: string[]) => setV({ ...v, permisos }) } : {})}
        />
      </fieldset>
    </Sheet>
  );
}
