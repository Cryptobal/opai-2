"use client";

import { lazy, Suspense, useState } from "react";

import { Badge, Button, type EstadoPantalla, ListScreen } from "@opai/ds";

import type { Objetivo } from "./dialogo-rol";

// Diferido: solo se descarga al cambiar un rol (presupuesto de JS, ADR-037).
const DialogoRol = lazy(() => import("./dialogo-rol").then((m) => ({ default: m.DialogoRol })));

export type UsuarioPlataforma = {
  id: string;
  nombre: string;
  email: string;
  platformRole: "owner" | "support" | null;
};

export const ROL_PLATAFORMA: Record<string, string> = {
  owner: "Owner",
  support: "Soporte (solo lectura)",
};

/** Lista de usuarios de plataforma con «Cambiar rol» y «Dar rol a un correo». */
export function UsuariosPlataforma(props: {
  state: EstadoPantalla;
  items: UsuarioPlataforma[];
  yo: string | null;
}) {
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  return (
    <>
      <ListScreen<UsuarioPlataforma>
        state={props.state}
        titulo="Usuarios de plataforma"
        soloTelefono
        accionPrincipal={
          <Button onClick={() => setObjetivo({ email: "", nombre: null, rol: null })}>
            Dar rol a un correo
          </Button>
        }
        items={props.items}
        clave={(u) => u.id}
        textos={{
          vacio: {
            titulo: "Sin usuarios de plataforma",
            descripcion: "Nadie tiene rol de plataforma.",
          },
        }}
        tarjeta={(u) => (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-base text-fg">{u.nombre}</span>
              <span className="t-caption truncate">{u.email}</span>
            </span>
            <Badge tono={u.platformRole === "owner" ? "accent" : "neutro"}>
              {ROL_PLATAFORMA[u.platformRole ?? ""] ?? "Sin rol"}
            </Badge>
          </>
        )}
        columnas={[
          { id: "nombre", etiqueta: "Nombre", render: (u) => u.nombre },
          { id: "email", etiqueta: "Correo", render: (u) => u.email },
          {
            id: "rol",
            etiqueta: "Rol",
            render: (u) => (
              <Badge tono={u.platformRole === "owner" ? "accent" : "neutro"}>
                {ROL_PLATAFORMA[u.platformRole ?? ""] ?? "Sin rol"}
              </Badge>
            ),
          },
        ]}
        acciones={(u) =>
          u.id === props.yo ? (
            <span className="t-caption">Tu rol lo cambia otro owner</span>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setObjetivo({ email: u.email, nombre: u.nombre, rol: u.platformRole })}
            >
              Cambiar rol
            </Button>
          )
        }
      />
      {objetivo ? (
        <Suspense fallback={null}>
          <DialogoRol objetivo={objetivo} onCerrar={() => setObjetivo(null)} />
        </Suspense>
      ) : null}
    </>
  );
}
