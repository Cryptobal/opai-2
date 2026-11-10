"use client";

import { Avatar } from "../components/avatar";
import { type ItemMenu, Menu } from "../components/menu";
import type { Usuario } from "./types";

type Props = {
  usuario: Usuario;
  items: readonly ItemMenu[];
  lado?: "abajo-derecha" | "arriba-izquierda";
  /** Muestra nombre y rol junto al avatar (barra lateral de desktop). */
  conNombre?: boolean;
};

/** Avatar + menú en la barra superior (teléfono / iPad). */
export function MenuUsuarioBarra(props: {
  usuario?: Usuario;
  menuUsuario?: readonly ItemMenu[];
  lado?: "abajo-derecha" | "arriba-izquierda";
}) {
  const { usuario, menuUsuario } = props;
  if (!usuario) return null;
  if (!menuUsuario) return <Avatar nombre={usuario.nombre} />;
  return (
    <UserMenu
      usuario={usuario}
      items={menuUsuario}
      {...(props.lado ? { lado: props.lado } : {})}
    />
  );
}

/** Avatar con menú: nombre y correo, empresas (si hay más de una), perfil y cerrar sesión. */
export function UserMenu({ usuario, items, lado, conNombre }: Props) {
  return (
    <Menu
      etiqueta="Menú de usuario"
      claseContenido="w-[248px]"
      items={items}
      {...(lado ? { lado } : {})}
      {...(conNombre ? { className: "w-full", claseDisparador: "w-full justify-start" } : {})}
      cabecera={
        <div className="flex items-center gap-2">
          <Avatar nombre={usuario.nombre} />
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-fg">{usuario.nombre}</p>
            {usuario.email ? (
              <p className="truncate text-xs text-fg-muted">{usuario.email}</p>
            ) : null}
          </div>
        </div>
      }
      disparador={
        conNombre ? (
          <span className="flex min-h-11 w-full items-center gap-2.5 px-2 py-1 text-left">
            <Avatar nombre={usuario.nombre} />
            <span className="min-w-0">
              <span className="block truncate text-base font-medium text-fg">{usuario.nombre}</span>
              {usuario.rol ? (
                <span className="block truncate text-xs text-fg-muted">{usuario.rol}</span>
              ) : null}
            </span>
          </span>
        ) : (
          <Avatar nombre={usuario.nombre} />
        )
      }
    />
  );
}
