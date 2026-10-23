import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";
import { estadoPantalla } from "@/lib/formato";

import { PaginaConfig } from "../_centro/pagina-config";
import { type Invitacion, type Miembro, UsuariosLista } from "./usuarios-lista";

export const metadata = { title: "Usuarios y permisos" };

/** Usuarios y permisos (23). */
export default function Usuarios() {
  return (
    <PaginaConfig
      seccion="usuarios"
      titulo="Usuarios y permisos"
      cargar={async () => {
        const [usuarios, invitaciones, identidad] = await Promise.all([
          ejecutarComoUsuario<Miembro[]>("erp", "core.users.list"),
          ejecutarComoUsuario<Invitacion[]>("erp", "core.invitations.list", { soloPendientes: true }),
          identidadActual(),
        ]);
        return { usuarios, invitaciones, rol: identidad?.actual?.rol ?? "viewer" };
      }}
    >
      {({ usuarios, invitaciones, rol }) => (
        <UsuariosLista
          state={estadoPantalla(usuarios)}
          usuarios={usuarios.ok ? usuarios.data : []}
          invitaciones={invitaciones.ok ? invitaciones.data : []}
          puedeGestionar={invitaciones.ok}
          miRol={rol}
        />
      )}
    </PaginaConfig>
  );
}
