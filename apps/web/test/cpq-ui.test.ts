import { describe, expect, it } from "vitest";

import { AREAS_NAV, ROLES } from "@opai/domain";
import { manifest } from "../../../modules/cpq/manifest";

import { accesoCpq } from "@/lib/cpq-ui";
import { armarNavegacion } from "@/lib/navegacion-areas";
import { puedeDeIdentidad } from "@/lib/permisos-ui";

import { identidadCpq } from "./cpq-fixtures";

const entradas = manifest.navegacion.flatMap((e) =>
  AREAS_NAV.filter((area) => area === e.area).map((area) => ({ ...e, area, modulo: "cpq" })),
);

describe("CPQ CAR-132: entrada y acciones con permisos efectivos", () => {
  for (const rol of ROLES)
    it(`${rol}: lectura y creación`, () => {
      const i = identidadCpq(rol);
      const esperado = {
        leer: rol !== "supervisor",
        crear: !["supervisor", "viewer"].includes(rol),
        aprobar: rol !== "supervisor" && ["owner", "admin"].includes(rol),
        aprobarEnvios: rol !== "supervisor" && ["owner", "admin"].includes(rol),
      };
      expect(accesoCpq(i)).toEqual(esperado);
      const nav = armarNavegacion(entradas, {
        puede: puedeDeIdentidad(i),
        modulosActivos: i.modulosActivos,
      });
      expect(nav.flatMap((g) => g.entradas).some((e) => e.href === "/cotizaciones")).toBe(
        esperado.leer,
      );
      if (esperado.leer) expect(nav[0]?.area).toBe("comercial");
    });
  it("módulo apagado o sesión ausente: no muestra entrada ni acciones", () => {
    const i = { ...identidadCpq(), modulosActivos: ["comercial"] };
    expect(accesoCpq(i)).toEqual({ leer: false, crear: false, aprobar: false, aprobarEnvios: false });
    expect(accesoCpq(null)).toEqual({ leer: false, crear: false, aprobar: false, aprobarEnvios: false });
    expect(armarNavegacion(entradas, { puede: () => true, modulosActivos: [] })).toEqual([]);
  });
  it("un rol personalizado y una denegación prevalecen sobre owner", () => {
    const i = identidadCpq();
    i.acceso.permisosRol = ["cpq:cotizaciones.manage"];
    expect(accesoCpq(i)).toEqual({ leer: false, crear: false, aprobar: false, aprobarEnvios: false });
    i.acceso.permisosRol = null;
    i.acceso.excepciones = [{ permiso: "cpq:cotizaciones.read", conceder: false }];
    expect(accesoCpq(i)).toEqual({ leer: false, crear: false, aprobar: false, aprobarEnvios: false });
  });
});
