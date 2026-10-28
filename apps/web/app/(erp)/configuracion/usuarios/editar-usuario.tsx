"use client";

import { useState } from "react";

import { avisar, Button, Dialog, Sheet, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { fechaHora } from "@/lib/formato";

import { CampoRolUsuario, permisosDeSeleccion, seleccionDe } from "./campo-rol-usuario";
import { CampoPortales } from "./campos";
import { ExcepcionesUsuario } from "./excepciones-usuario";
import { escrituraFicha } from "./guardar-usuario";
import type { PropsFicha } from "./hojas-usuario";
import type { Miembro } from "./usuarios-lista";
import { useExcepciones } from "./use-excepciones";

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
  const [rolSel, setRolSel] = useState(seleccionDe(miembro));
  const [portales, setPortales] = useState<string[]>(miembro.portales);
  const [activo, setActivo] = useState(miembro.estado === "activa");
  const [confirmar, setConfirmar] = useState(false);
  const { excepciones, recargar } = useExcepciones(miembro.id);

  // «Qué puede hacer» con la selección: permisos del rol + concedidas − denegadas. Un owner no lleva
  // excepciones (al promoverlo se borran), así que ahí no se aplican.
  const delRol = permisosDeSeleccion(rolSel, p.roles);
  const efectivos = new Set(delRol ?? []);
  const lista = Array.isArray(excepciones) && rolSel !== "base:owner" ? excepciones : [];
  for (const e of lista) if (e.conceder) efectivos.add(e.permiso);
  for (const e of lista) if (!e.conceder) efectivos.delete(e.permiso);

  async function guardar() {
    const ficha = {
      membershipId: miembro.id,
      rol: miembro.rol,
      roleId: miembro.roleId,
      portales: miembro.portales,
      activo: miembro.estado === "activa",
    };
    const e = escrituraFicha(ficha, { rolSel, portales, activo });
    const ok =
      e.id === "core.roles.assign"
        ? await ejecutar("core.roles.assign", e.input)
        : await ejecutar("core.users.update", e.input);
    if (ok) {
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
            efectivos={delRol === null ? null : [...efectivos]}
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
