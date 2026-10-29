import { Plus } from "lucide-react";

import { Badge, Empty, FilaSeleccionable, SeccionTarjeta } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { LinkNext } from "@/app/_components/link-next";

import { nombreRol, type RolVista } from "../_permisos/roles";

const usuarios = (n: number) => (n === 1 ? "1 usuario" : `${n} usuarios`);

function Fila({ r }: { r: RolVista }) {
  return (
    <FilaSeleccionable
      href={`?rol=${encodeURIComponent(r.id)}`}
      Link={LinkNext}
      titulo={nombreRol(r)}
      secundario={r.descripcion ?? undefined}
      fin={
        <span className="flex flex-col items-end gap-1">
          <Badge tono={r.sistema ? "neutro" : "info"}>
            {r.sistema ? "Del sistema" : "Personalizado"}
          </Badge>
          <span className="t-caption whitespace-nowrap">{usuarios(r.usuarios)}</span>
        </span>
      }
    />
  );
}

/** Pestaña Roles (A1): personalizados primero, luego los cinco del sistema (no editables). */
export function RolesLista({ roles, gestiona }: { roles: RolVista[]; gestiona: boolean }) {
  const propios = roles.filter((r) => !r.sistema);
  const sistema = roles.filter((r) => r.sistema);
  return (
    <>
      <SeccionTarjeta titulo="Personalizados" sinRelleno>
        {propios.length ? (
          <ul aria-label="Roles personalizados">
            {propios.map((r) => (
              <li key={r.id}>
                <Fila r={r} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            titulo="Aún no hay roles personalizados"
            descripcion="Crea un rol con los permisos exactos que necesita tu equipo. Los cinco roles del sistema siguen disponibles."
            {...(gestiona
              ? {
                  accion: (
                    <EnlaceBotonHoja href="?nuevo=1" icono={Plus}>
                      Nuevo rol
                    </EnlaceBotonHoja>
                  ),
                }
              : {})}
          />
        )}
      </SeccionTarjeta>
      <SeccionTarjeta titulo="Del sistema" sinRelleno>
        <ul aria-label="Roles del sistema">
          {sistema.map((r) => (
            <li key={r.id}>
              <Fila r={r} />
            </li>
          ))}
        </ul>
      </SeccionTarjeta>
    </>
  );
}
