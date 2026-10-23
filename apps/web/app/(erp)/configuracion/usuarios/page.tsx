import { Plus } from "lucide-react";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { PaginaConfig } from "../_centro/pagina-config";
import { HojasUsuario } from "./diferidas";
import { MatrizPermisos } from "./matriz-permisos";
import { type Invitacion, type Miembro, UsuariosLista } from "./usuarios-lista";

export const metadata = { title: "Usuarios y permisos" };

/** Usuarios y permisos (23): miembros, invitaciones pendientes y matriz de permisos. */
export default function Usuarios() {
  return (
    <PaginaConfig
      seccion="usuarios"
      titulo="Usuarios y permisos"
      cargar={async () => {
        const [usuarios, invitaciones, identidad] = await Promise.all([
          ejecutarComoUsuario<Miembro[]>("erp", "core.users.list"),
          ejecutarComoUsuario<Invitacion[]>("erp", "core.invitations.list", {
            soloPendientes: true,
          }),
          identidadActual(),
        ]);
        return { usuarios, invitaciones, rol: identidad?.actual?.rol ?? "viewer" };
      }}
      cabecera={({ usuarios, invitaciones }) => {
        const n = usuarios.ok ? usuarios.data.length : 0;
        const p = invitaciones.ok ? invitaciones.data.length : 0;
        return {
          subtitulo: `${n} ${n === 1 ? "usuario" : "usuarios"}${p ? ` · ${p} ${p === 1 ? "invitación pendiente" : "invitaciones pendientes"}` : ""}`,
          ...(invitaciones.ok
            ? {
                acciones: (
                  <EnlaceBoton href="?invitar=1" icono={Plus}>
                    Invitar
                  </EnlaceBoton>
                ),
              }
            : {}),
        };
      }}
    >
      {({ usuarios, invitaciones, rol }) => (
        <div className="flex flex-col gap-4">
          <UsuariosLista
            state={estadoPantalla(usuarios)}
            usuarios={usuarios.ok ? usuarios.data : []}
            invitaciones={invitaciones.ok ? invitaciones.data : []}
            puedeGestionar={invitaciones.ok}
          />
          <MatrizPermisos />
          {invitaciones.ok ? (
            <HojasUsuario usuarios={usuarios.ok ? usuarios.data : []} miRol={rol} />
          ) : null}
        </div>
      )}
    </PaginaConfig>
  );
}
