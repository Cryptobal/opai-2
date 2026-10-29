import { describe, expect, it } from "vitest";

import {
  idsCatalogo,
  type ModuloCatalogo,
  nombrePermiso,
  resumenPermisos,
} from "@/app/(erp)/configuracion/usuarios/_permisos/etiquetas";

const CATALOGO: ModuloCatalogo[] = [
  {
    modulo: "core",
    activo: true,
    recursos: [
      { recurso: "instalaciones", ver: "core:instalaciones.read", gestionar: "core:instalaciones.manage" },
      { recurso: "personas", ver: "core:personas.read", gestionar: "core:personas.manage" },
    ],
    especiales: [{ id: "core:estructuras.read_sensible", accion: "estructuras.read_sensible" }],
  },
  { modulo: "finanzas", activo: false, recursos: [{ recurso: "pagos", ver: "finanzas:pagos.read", gestionar: null }], especiales: [] },
];

describe("etiquetas de la matriz de permisos (CAR-37)", () => {
  it("nombra los permisos como en la sábana", () => {
    expect(nombrePermiso("core:instalaciones.manage")).toBe("Gestionar Instalaciones");
    expect(nombrePermiso("core:personas.read")).toBe("Ver Personas");
    expect(nombrePermiso("core:estructuras.read_sensible")).toBe("Ver sensible · Estructuras y sueldos");
  });

  it("lista los ids del catálogo sin nulos", () => {
    expect(idsCatalogo(CATALOGO)).toEqual([
      "core:instalaciones.read",
      "core:instalaciones.manage",
      "core:personas.read",
      "core:personas.manage",
      "core:estructuras.read_sensible",
      "finanzas:pagos.read",
    ]);
  });

  it("resume «Qué puede hacer» por módulo activo", () => {
    expect(
      resumenPermisos(CATALOGO, [
        "core:instalaciones.read",
        "core:personas.read",
        "core:personas.manage",
        "finanzas:pagos.read",
      ]),
    ).toEqual([{ modulo: "Núcleo", texto: "Instalaciones: ver · Personas: ver y gestionar" }]);
    expect(resumenPermisos(CATALOGO, [])).toEqual([]);
  });
});
