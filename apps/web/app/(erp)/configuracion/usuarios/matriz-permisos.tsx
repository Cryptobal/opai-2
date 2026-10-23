import { Check, Minus } from "lucide-react";

import { Badge, SeccionTarjeta, Table, Td, Th, Tr } from "@opai/ds";
import { ROLES, tienePermiso } from "@opai/domain";

import { ETIQUETA_ROL } from "@/app/_components/portales";

import { ACCIONES, permisosPorRol } from "./matriz-datos";

/** Matriz de permisos (23): solo lectura, calculada desde los roles de OPAI (ADR-016). */
export function MatrizPermisos() {
  return (
    <SeccionTarjeta titulo="Matriz de permisos" sinRelleno>
      <p className="t-caption px-4 pt-3">Solo lectura · los roles los define OPAI</p>
      <ul className="flex flex-col md:hidden">
        {ROLES.map((r) => {
          const ok = permisosPorRol(r);
          return (
            <li key={r} className="flex flex-col gap-2 border-t border-border px-4 py-3">
              <span className="flex items-center justify-between gap-2">
                <strong className="text-base font-semibold">{ETIQUETA_ROL[r] ?? r}</strong>
                <Badge tono="neutro">
                  {ok.length} de {ACCIONES.length}
                </Badge>
              </span>
              <span className="text-sm text-fg-muted">
                {ok.length ? ok.join(" · ") : "Sin permisos de gestión"}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="p-2 max-md:hidden">
        <Table className="text-sm">
          <thead>
            <tr>
              <Th>Módulo · acción</Th>
              {ROLES.map((r) => (
                <Th key={r} className="text-center">
                  {ETIQUETA_ROL[r] ?? r}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ACCIONES.map((a) => (
              <Tr key={a.permiso}>
                <Td>{a.etiqueta}</Td>
                {ROLES.map((r) => (
                  <Td key={r} className="text-center">
                    {tienePermiso(r, a.permiso) ? (
                      <Check className="mx-auto size-4 text-fg" aria-label="Sí" />
                    ) : (
                      <Minus className="mx-auto size-4 text-fg-subtle" aria-label="No" />
                    )}
                  </Td>
                ))}
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
    </SeccionTarjeta>
  );
}
