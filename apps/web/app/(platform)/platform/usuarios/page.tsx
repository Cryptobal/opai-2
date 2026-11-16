import { getSession } from "@opai/auth";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { Superadmin } from "../_componentes/formato";
import { type UsuarioPlataforma, UsuariosPlataforma } from "./_componentes/usuarios-plataforma";

export const metadata = { title: "Usuarios de plataforma" };

/**
 * Plataforma → Usuarios (CAR-323): quién administra OPAI (owner o support) y el cambio de rol con
 * confirmación en dos pasos. Nadie cambia su propio rol y OPAI conserva al menos un owner.
 */
export default function Usuarios() {
  return (
    <PaginaPortal
      portal="platform"
      titulo="Usuarios de plataforma"
      ruta="/platform/usuarios"
      opciones={() => ({ titulo: "Usuarios de plataforma", insignia: <Superadmin /> })}
      cargar={async () => {
        const r = await ejecutarComoUsuario<UsuarioPlataforma[]>(
          "platform",
          "platform.users.list",
          {},
        );
        const s = await getSession();
        return { state: estadoPantalla(r), items: r.ok ? r.data : [], yo: s?.user.id ?? null };
      }}
    >
      {(d) => <UsuariosPlataforma state={d.state} items={d.items} yo={d.yo} />}
    </PaginaPortal>
  );
}
