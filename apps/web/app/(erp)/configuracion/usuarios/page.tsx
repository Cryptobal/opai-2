import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { type Invitacion, type Miembro, UsuariosLista } from "./usuarios-lista";

export const metadata = { title: "Usuarios" };

async function Contenido() {
  const [usuarios, invitaciones, identidad] = await Promise.all([
    ejecutarComoUsuario<Miembro[]>("erp", "core.users.list"),
    ejecutarComoUsuario<Invitacion[]>("erp", "core.invitations.list", { soloPendientes: true }),
    identidadActual(),
  ]);
  return (
    <UsuariosLista
      state={estadoPantalla(usuarios)}
      usuarios={usuarios.ok ? usuarios.data : []}
      invitaciones={invitaciones.ok ? invitaciones.data : []}
      puedeGestionar={invitaciones.ok}
      miRol={identidad?.actual?.rol ?? "viewer"}
    />
  );
}

export default function Usuarios() {
  return (
    <PaginaPortal portal="erp" titulo="Usuarios" ruta="/configuracion/usuarios">
      <Contenido />
    </PaginaPortal>
  );
}
