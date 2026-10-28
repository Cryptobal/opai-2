"use client";

import { useCallback, useEffect, useState } from "react";

import { avisar, Button, Dialog, Sheet, Switch } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { fechaHora } from "@/lib/formato";

import { CampoRolUsuario, permisosDeSeleccion, seleccionDe } from "./campo-rol-usuario";
import { CampoPortales } from "./campos";
import { type Excepcion, ExcepcionesUsuario } from "./excepciones-usuario";
import type { PropsFicha } from "./hojas-usuario";
import type { Miembro } from "./usuarios-lista";

type Props = PropsFicha & { miembro: Miembro | null; onCerrar: () => void; ultimoOwner: boolean };

/** Ficha de usuario (A4): rol base o personalizado, portales, excepciones y acceso. */
export function EditarUsuario(props: Props) {
  // Un formulario por miembro (key): el estado inicial sale de sus datos.
  return props.miembro ? (
    <Formulario key={props.miembro.id} {...props} miembro={props.miembro} />
  ) : null;
}

function Formulario(p: Props & { miembro: Miembro }) {
  const { miembro } = p;
  const { ejecutar, error } = useCapacidad("erp");
  const inicial = seleccionDe(miembro);
  const [rolSel, setRolSel] = useState(inicial);
  const [portales, setPortales] = useState<string[]>(miembro.portales);
  const [activo, setActivo] = useState(miembro.estado === "activa");
  const [confirmar, setConfirmar] = useState(false);
  const [excepciones, setExcepciones] = useState<Excepcion[] | null | Error>(null);

  const leer = useCallback(
    () => ejecutarCapacidad("erp", "core.excepciones.list", { membershipId: miembro.id }),
    [miembro.id],
  );
  const recargar = useCallback(async () => {
    const r = await leer();
    setExcepciones(r.ok ? (r.data as Excepcion[]) : new Error(r.error.message));
  }, [leer]);
  useEffect(() => {
    let vigente = true;
    void leer().then((r) => {
      if (vigente) setExcepciones(r.ok ? (r.data as Excepcion[]) : new Error(r.error.message));
    });
    return () => {
      vigente = false;
    };
  }, [leer]);

  // «Qué puede hacer» con la selección actual: permisos del rol + concedidas − denegadas.
  const efectivos = new Set(permisosDeSeleccion(rolSel, p.roles));
  const lista = Array.isArray(excepciones) ? excepciones : [];
  for (const e of lista) if (e.conceder) efectivos.add(e.permiso);
  for (const e of lista) if (!e.conceder) efectivos.delete(e.permiso);

  async function guardar() {
    const cambiaRol = rolSel !== inicial;
    // Rol personalizado (A21): `core.roles.assign` conserva el rol base y valida la escalada.
    if (cambiaRol && rolSel.startsWith("rol:")) {
      const ok = await ejecutar("core.roles.assign", {
        membershipId: miembro.id,
        roleId: rolSel.slice(4),
      });
      if (!ok) return;
    }
    const base =
      cambiaRol && rolSel.startsWith("base:")
        ? { rol: rolSel.slice(5), ...(miembro.roleId ? { roleId: null } : {}) }
        : {};
    const input = {
      membershipId: miembro.id,
      ...base,
      portales,
      estado: activo ? "activa" : "suspendida",
    };
    if (await ejecutar("core.users.update", input)) {
      avisar.exito("Usuario actualizado");
      p.onCerrar();
    }
  }

  async function quitar() {
    setConfirmar(false);
    if (await ejecutar("core.users.remove", { membershipId: miembro.id })) p.onCerrar();
  }

  return (
    <>
      <Sheet
        abierto
        onCerrar={p.onCerrar}
        titulo={miembro.nombre}
        descripcion={`${miembro.email}${miembro.ultimoAccesoEn ? ` · Último acceso: ${fechaHora(miembro.ultimoAccesoEn)}` : ""}`}
        acciones={
          <>
            <Button variant="secondary" size="lg" onClick={() => setConfirmar(true)}>
              Quitar
            </Button>
            <Button size="lg" className="flex-1" onClick={guardar}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {error ? <p className="text-sm font-medium text-danger-fg">{error}</p> : null}
          <CampoRolUsuario
            miembro={miembro}
            valor={rolSel}
            onCambiar={setRolSel}
            miRol={p.miRol}
            roles={p.roles}
            gestionaRoles={p.gestionaRoles}
            ultimoOwner={p.ultimoOwner}
            catalogo={p.catalogo}
            efectivos={[...efectivos]}
          />
          <CampoPortales valor={portales} onCambiar={setPortales} />
          <ExcepcionesUsuario
            membershipId={miembro.id}
            nombre={miembro.nombre}
            excepciones={excepciones}
            onRecargar={() => void recargar()}
            gestiona={p.gestionaRoles}
            esOwner={miembro.rol === "owner"}
            catalogo={p.catalogo}
            concedibles={p.concedibles}
          />
          <Switch
            etiqueta="Acceso activo"
            descripcion="Suspendido no puede entrar"
            activo={activo}
            onCambiar={setActivo}
          />
        </div>
      </Sheet>
      <Dialog
        abierto={confirmar}
        onCerrar={() => setConfirmar(false)}
        titulo={`¿Quitar a ${miembro.nombre} de la empresa?`}
        descripcion="Pierde el acceso de inmediato. Para volver necesitará una invitación nueva."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setConfirmar(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={quitar}>
              Quitar
            </Button>
          </>
        }
      />
    </>
  );
}
