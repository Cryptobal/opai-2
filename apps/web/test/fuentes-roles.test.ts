// CAR-359: los roles adicionales del miembro y los de sus grupos vigentes suman permisos; un rol o
// un grupo archivado no concede nada.
import { expect, it } from "vitest";

import { permisosAdicionalesDe } from "../lib/fuentes-roles";

const rol = (permisos: string[], archivadoEn: Date | null = null) => ({
  rol: { permisos, archivadoEn },
});

it("suma los roles adicionales y los de sus grupos, sin repetir", () => {
  expect(
    permisosAdicionalesDe({
      rolesAdicionales: [rol(["rendiciones:aprobar"]), rol(["core:cuentas.read"])],
      gruposUsuarios: [
        { grupo: { archivadoEn: null, roles: [rol(["core:cuentas.read", "tickets:*"])] } },
      ],
    }),
  ).toEqual(["core:cuentas.read", "rendiciones:aprobar", "tickets:*"]);
});

it("un rol archivado o un grupo archivado no conceden nada", () => {
  expect(
    permisosAdicionalesDe({
      rolesAdicionales: [rol(["*"], new Date())],
      gruposUsuarios: [
        { grupo: { archivadoEn: new Date(), roles: [rol(["finanzas:*"])] } },
        { grupo: { archivadoEn: null, roles: [rol(["nomina:*"], new Date())] } },
      ],
    }),
  ).toEqual([]);
});

it("sin roles adicionales ni grupos no suma nada", () => {
  expect(permisosAdicionalesDe({ rolesAdicionales: [], gruposUsuarios: [] })).toEqual([]);
});
