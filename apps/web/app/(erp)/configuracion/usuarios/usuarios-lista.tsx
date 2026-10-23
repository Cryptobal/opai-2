"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";

import { Avatar, Badge, Button, type EstadoPantalla, ListScreen } from "@opai/ds";

import { ETIQUETA_ROL } from "@/app/_components/portales";
import { ETIQUETA_PORTAL } from "@/lib/formato";

import { EditarUsuario } from "./editar-usuario";
import { InvitacionesPendientes } from "./invitaciones";
import { InvitarUsuario } from "./invitar-usuario";

export type Miembro = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  portales: string[];
  estado: string;
};
export type Invitacion = {
  id: string;
  email: string;
  rol: string;
  estado: string;
  expiresAt: Date;
};

type Props = {
  state: EstadoPantalla;
  usuarios: Miembro[];
  invitaciones: Invitacion[];
  puedeGestionar: boolean;
  miRol: string;
};

const estadoBadge = (m: Miembro) =>
  m.estado === "activa" ? (
    <Badge tono="success">Activo</Badge>
  ) : (
    <Badge tono="warning">Suspendido</Badge>
  );
const portales = (m: Miembro) => m.portales.map((p) => ETIQUETA_PORTAL[p] ?? p).join(", ");

/** Configuración → Usuarios: lista, invitar (Sheet) y editar rol, portales o estado (Sheet). */
export function UsuariosLista({ state, usuarios, invitaciones, puedeGestionar, miRol }: Props) {
  const [invitar, setInvitar] = useState(false);
  const [editando, setEditando] = useState<Miembro | null>(null);
  return (
    <div className="flex flex-col gap-8">
      <ListScreen
        state={state}
        titulo="Usuarios"
        subtitulo={`${usuarios.length} ${usuarios.length === 1 ? "persona" : "personas"} con acceso`}
        accionPrincipal={
          puedeGestionar ? (
            <Button onClick={() => setInvitar(true)}>
              <UserPlus className="size-4" /> Invitar usuario
            </Button>
          ) : undefined
        }
        items={usuarios}
        clave={(m) => m.id}
        {...(puedeGestionar ? { onSeleccionar: setEditando } : {})}
        tarjeta={(m) => (
          <>
            <Avatar nombre={m.nombre} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-md font-medium text-fg">{m.nombre}</span>
              <span className="block truncate text-base text-fg-muted">
                {ETIQUETA_ROL[m.rol] ?? m.rol} · {m.email}
              </span>
            </span>
            {estadoBadge(m)}
          </>
        )}
        columnas={[
          {
            id: "nombre",
            etiqueta: "Nombre",
            render: (m) => <span className="font-medium">{m.nombre}</span>,
          },
          { id: "email", etiqueta: "Correo", render: (m) => m.email },
          { id: "rol", etiqueta: "Rol", render: (m) => ETIQUETA_ROL[m.rol] ?? m.rol },
          { id: "portales", etiqueta: "Portales", render: portales },
          { id: "estado", etiqueta: "Estado", render: estadoBadge },
        ]}
      />
      {puedeGestionar && invitaciones.length > 0 ? (
        <InvitacionesPendientes invitaciones={invitaciones} />
      ) : null}
      <InvitarUsuario abierto={invitar} onCerrar={() => setInvitar(false)} miRol={miRol} />
      <EditarUsuario miembro={editando} onCerrar={() => setEditando(null)} miRol={miRol} />
    </div>
  );
}
