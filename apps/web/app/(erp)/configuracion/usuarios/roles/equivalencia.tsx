import { SeccionTarjeta, Table, Td, Th, Tr } from "@opai/ds";

import { ETIQUETA_ROL } from "@/app/_components/portales";

/**
 * Equivalencia 1.0 → 2.0 (§16.1, sábana A5; detalle en `docs/2.0/paridad/equivalencia-roles.md`):
 * guía de alta, porque los usuarios no se migran.
 */
const FILAS: readonly [string, string][] = [
  ["owner", ETIQUETA_ROL["owner"] ?? "Owner"],
  ["admin", ETIQUETA_ROL["admin"] ?? "Admin"],
  ["editor", "Gerente"],
  ["jefe_operaciones", "Gerente"],
  ["supervisor", "Supervisor"],
  ["viewer", ETIQUETA_ROL["viewer"] ?? "Viewer"],
  ["central_monitoreo", "Central de monitoreo (personalizado)"],
  ["inspector_dt", "Inspector DT (personalizado)"],
];

export function EquivalenciaRoles() {
  return (
    <SeccionTarjeta titulo="Si vienes de OPAI 1.0" sinRelleno>
      <Table className="text-sm">
        <thead>
          <tr>
            <Th>Rol en 1.0</Th>
            <Th>Rol en 2.0</Th>
          </tr>
        </thead>
        <tbody>
          {FILAS.map(([antes, ahora]) => (
            <Tr key={antes}>
              <Td className="font-mono">{antes}</Td>
              <Td className="whitespace-normal">{ahora}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <p className="t-caption px-4 py-3">Los roles antiguos que ya no se usan no se recrean.</p>
    </SeccionTarjeta>
  );
}
