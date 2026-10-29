import { Plus } from "lucide-react";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaConfig } from "../_centro/pagina-config";
import { cargarPermisos } from "./_permisos/datos";
import { PestanasUsuarios } from "./_permisos/pestanas";
import { HojasUsuario } from "./diferidas";
import { type Invitacion, type Miembro, UsuariosLista } from "./usuarios-lista";

export const metadata = { title: "Usuarios y permisos" };

/**
 * Usuarios y permisos (23; sábana 07c A1/A4): miembros, invitaciones pendientes y la ficha con rol
 * (base o personalizado), «Qué puede hacer» y excepciones. Los roles y su matriz, en la pestaña Roles.
 */
export default function Usuarios() {
  return (
    <PaginaConfig
      seccion="usuarios"
      titulo="Usuarios y permisos"
      cargar={async () => {
        const [usuarios, invitaciones, permisos] = await Promise.all([
          ejecutarComoUsuario<Miembro[]>("erp", "core.users.list"),
          ejecutarComoUsuario<Invitacion[]>("erp", "core.invitations.list", {
            soloPendientes: true,
          }),
          cargarPermisos(),
        ]);
        return { usuarios, invitaciones, ...permisos };
      }}
      cabecera={({ usuarios, invitaciones }) => {
        const n = usuarios.ok ? usuarios.data.length : 0;
        const p = invitaciones.ok ? invitaciones.data.length : 0;
        return {
          subtitulo: `${n} ${n === 1 ? "usuario" : "usuarios"}${p ? ` · ${p} ${p === 1 ? "invitación pendiente" : "invitaciones pendientes"}` : ""}`,
          ...(invitaciones.ok
            ? {
                acciones: (
                  <EnlaceBotonHoja href="?invitar=1" icono={Plus}>
                    Invitar usuario
                  </EnlaceBotonHoja>
                ),
              }
            : {}),
        };
      }}
    >
      {({ usuarios, invitaciones, miRol, roles, catalogo, concedibles, gestionaRoles }) => (
        <div className="flex flex-col gap-4">
          <PestanasUsuarios activa="usuarios" />
          <UsuariosLista
            state={estadoPantalla(usuarios)}
            usuarios={usuarios.ok ? usuarios.data : []}
            invitaciones={invitaciones.ok ? invitaciones.data : []}
            puedeGestionar={invitaciones.ok}
          />
          {invitaciones.ok ? (
            <HojasUsuario
              usuarios={usuarios.ok ? usuarios.data : []}
              miRol={miRol}
              roles={roles.ok ? roles.data : []}
              catalogo={catalogo.ok ? catalogo.data : []}
              concedibles={concedibles}
              gestionaRoles={gestionaRoles}
            />
          ) : null}
        </div>
      )}
    </PaginaConfig>
  );
}
