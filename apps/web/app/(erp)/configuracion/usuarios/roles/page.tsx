import { Plus } from "lucide-react";

import { Alerta, Estado } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { estadoPantalla } from "@/lib/formato";

import { PaginaConfig } from "../../_centro/pagina-config";
import { cargarPermisos } from "../_permisos/datos";
import { PestanasUsuarios } from "../_permisos/pestanas";
import { HojasRol } from "./diferidas";
import { EquivalenciaRoles } from "./equivalencia";
import { RolesLista } from "./roles-lista";

export const metadata = { title: "Roles · Usuarios y permisos" };

/**
 * Configuración → Usuarios y permisos → Roles (Brief 07c bloque 6, CAR-37): roles personalizados y
 * del sistema, matriz de permisos editable y equivalencia con 1.0. Crear, editar y archivar es de
 * owner y admin (§16.2); el resto ve la matriz en solo lectura.
 */
export default function Roles() {
  return (
    <PaginaConfig
      seccion="usuarios"
      titulo="Usuarios y permisos"
      cargar={cargarPermisos}
      cabecera={({ roles, gestionaRoles }) => {
        const n = roles.ok ? roles.data.filter((r) => !r.sistema).length : 0;
        return {
          subtitulo: `${n} ${n === 1 ? "rol personalizado" : "roles personalizados"} · 5 del sistema`,
          ...(gestionaRoles && roles.ok
            ? {
                acciones: (
                  <EnlaceBotonHoja href="?nuevo=1" icono={Plus}>
                    Nuevo rol
                  </EnlaceBotonHoja>
                ),
              }
            : {}),
        };
      }}
    >
      {({ roles, catalogo, gestionaRoles, concedibles }) => (
        <div className="flex flex-col gap-4">
          <PestanasUsuarios activa="roles" />
          {!gestionaRoles && roles.ok ? (
            <Alerta tono="neutral" titulo="Solo lectura">
              Crean y editan roles solo el owner y los administradores de la empresa.
            </Alerta>
          ) : null}
          <Estado
            state={estadoPantalla(roles)}
            variante="lista"
            textos={{
              error: {
                titulo: "No pudimos cargar los roles",
                descripcion: "Revisa tu conexión e inténtalo de nuevo.",
              },
            }}
          >
            <RolesLista roles={roles.ok ? roles.data : []} gestiona={gestionaRoles} />
          </Estado>
          <EquivalenciaRoles />
          {roles.ok && catalogo.ok ? (
            <HojasRol
              roles={roles.data}
              catalogo={catalogo.data}
              concedibles={concedibles}
              gestiona={gestionaRoles}
            />
          ) : null}
        </div>
      )}
    </PaginaConfig>
  );
}
