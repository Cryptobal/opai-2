"use client";

import { Avatar } from "../components/avatar";
import { type ItemMenu, Menu } from "../components/menu";
import { Punto } from "./contador";
import type { Usuario } from "./types";

type Props = {
  usuario: Usuario;
  items: readonly ItemMenu[];
  lado?: "abajo-derecha" | "arriba-izquierda";
  /** Muestra nombre y rol junto al avatar (barra lateral de desktop). */
  conNombre?: boolean;
  /** Punto rojo sobre el avatar: novedades sin leer en portales sin Bandeja (CAR-316). */
  aviso?: boolean;
};

/** Avatar del disparador, con el punto rojo de aviso si corresponde. */
function AvatarAviso({ nombre, aviso }: { nombre: string; aviso?: boolean | undefined }) {
  if (!aviso) return <Avatar nombre={nombre} />;
  return (
    <span className="relative inline-flex">
      <Avatar nombre={nombre} />
      <Punto visible peligro />
    </span>
  );
}

/** Avatar + menú en la barra superior (teléfono / iPad). */
export function MenuUsuarioBarra(props: {
  usuario?: Usuario;
  menuUsuario?: readonly ItemMenu[];
  avisoNovedades?: boolean;
  lado?: "abajo-derecha" | "arriba-izquierda";
}) {
  const { usuario, menuUsuario, avisoNovedades } = props;
  if (!usuario) return null;
  if (!menuUsuario) return <Avatar nombre={usuario.nombre} />;
  return (
    <UserMenu
      usuario={usuario}
      items={menuUsuario}
      {...(props.lado ? { lado: props.lado } : {})}
      {...(avisoNovedades ? { aviso: true } : {})}
    />
  );
}

/** Avatar con menú: nombre y correo, empresas (si hay más de una), perfil y cerrar sesión. */
export function UserMenu({ usuario, items, lado, conNombre, aviso }: Props) {
  return (
    <Menu
      etiqueta={aviso ? "Menú de usuario, hay novedades sin leer" : "Menú de usuario"}
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
            <AvatarAviso nombre={usuario.nombre} aviso={aviso} />
            <span className="min-w-0">
              <span className="block truncate text-base font-medium text-fg">{usuario.nombre}</span>
              {usuario.rol ? (
                <span className="block truncate text-xs text-fg-muted">{usuario.rol}</span>
              ) : null}
            </span>
          </span>
        ) : (
          <AvatarAviso nombre={usuario.nombre} aviso={aviso} />
        )
      }
    />
  );
}
