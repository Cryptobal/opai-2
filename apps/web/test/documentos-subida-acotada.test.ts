import { describe, expect, it } from "vitest";

import { type Rol, tienePermisoEfectivo } from "@opai/domain";

import { opcionesDeSubida } from "@/app/(erp)/documentos/_componentes/subida-permisos";
import { vinculoInicial } from "@/app/_components/documentos/use-destino";

const puedeDe =
  (rol: Rol, excepciones: { permiso: string; conceder: boolean }[] = []) =>
  (permiso: string) =>
    tienePermisoEfectivo({ rol, excepciones }, permiso);

// CAR-182 (decisión de Carlos, 4-nov-2026): el supervisor sube solo a instalaciones a su cargo.
describe("«Subir» del explorador según el permiso", () => {
  it("el supervisor con alcance ve «Subir» y solo puede vincular a Instalación", () => {
    expect(opcionesDeSubida(puedeDe("supervisor"), "supervisor", true)).toEqual({
      puedeSubir: true,
      vinculables: ["instalacion"],
      acotada: true,
    });
  });

  it("sin alcance por filas o sin leer instalaciones no se ofrece", () => {
    expect(opcionesDeSubida(puedeDe("supervisor"), "supervisor", false).puedeSubir).toBe(false);
    const sinLectura = puedeDe("supervisor", [
      { permiso: "core:instalaciones.read", conceder: false },
    ]);
    expect(opcionesDeSubida(sinLectura, "supervisor", true).puedeSubir).toBe(false);
  });

  it("el viewer no sube; con el permiso denegado por excepción, tampoco el supervisor", () => {
    expect(opcionesDeSubida(puedeDe("viewer"), "viewer", true).puedeSubir).toBe(false);
    const denegado = puedeDe("supervisor", [
      { permiso: "core:documentos.subir_alcance", conceder: false },
    ]);
    expect(opcionesDeSubida(denegado, "supervisor", true).puedeSubir).toBe(false);
  });

  it("quien gestiona documentos conserva todo: empresa, cuenta, instalación y persona", () => {
    for (const rol of ["owner", "admin", "gerente"] as const) {
      expect(opcionesDeSubida(puedeDe(rol), rol, false)).toEqual({
        puedeSubir: true,
        vinculables: ["tenant", "cuenta", "instalacion", "persona"],
        acotada: false,
      });
    }
  });

  it("un supervisor con gestionar por excepción sigue sin «Subir» en el explorador (como antes)", () => {
    const gestiona = puedeDe("supervisor", [{ permiso: "core:documentos.manage", conceder: true }]);
    expect(opcionesDeSubida(gestiona, "supervisor", true).puedeSubir).toBe(false);
  });

  it("la hoja parte de Instalación, sin elegir, cuando la empresa no se ofrece", () => {
    const entidad = { tipo: "tenant", id: "t1" } as const;
    expect(vinculoInicial(entidad, { disponibles: ["instalacion"] })).toEqual({
      tipo: "instalacion",
      id: null,
      nombre: null,
    });
    expect(vinculoInicial(entidad, { disponibles: ["tenant", "cuenta"] }).tipo).toBe("tenant");
  });
});
