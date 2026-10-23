import { Check, Minus } from "lucide-react";

import { SeccionTarjeta, Table, Td, Th, Tr } from "@opai/ds";
import { PERMISOS_CORE as P, ROLES, tienePermiso } from "@opai/domain";

import { ETIQUETA_ROL } from "@/app/_components/portales";

const ACCIONES: { etiqueta: string; permiso: string }[] = [
  { etiqueta: "Cuentas · ver", permiso: P.cuentasRead },
  { etiqueta: "Cuentas · editar", permiso: P.cuentasManage },
  { etiqueta: "Instalaciones · editar", permiso: P.instalacionesManage },
  { etiqueta: "Personas · ver", permiso: P.personasRead },
  { etiqueta: "Personas · editar", permiso: P.personasManage },
  { etiqueta: "Personas · sueldos", permiso: P.estructurasReadSensible },
  { etiqueta: "Documentos · subir", permiso: P.documentosManage },
  { etiqueta: "Usuarios · gestionar", permiso: P.usersManage },
  { etiqueta: "Agentes · aprobar", permiso: P.aprobacionesManage },
  { etiqueta: "Configuración · editar", permiso: P.configManage },
];

/** Matriz de permisos (23): solo lectura, calculada desde los roles de OPAI (ADR-016). */
export function MatrizPermisos() {
  return (
    <SeccionTarjeta titulo="Matriz de permisos" sinRelleno>
      <p className="t-caption px-4 pt-3">Solo lectura · los roles los define OPAI</p>
      <div className="p-2">
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
