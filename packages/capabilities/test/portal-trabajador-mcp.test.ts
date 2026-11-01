import { beforeAll, describe, expect, it } from "vitest";

import { modulos } from "../../../modules/registry/src";
import { capacidadesDelNucleo } from "../src/core";
import { herramientasMcp } from "../src/mcp";
import { limpiarModulos, registrarModulos } from "../src/module";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import { contextoOwnerAgente } from "./paridad-util";

const agente = { tipo: "agent" as const, id: "k-portal-pt", viaUserId: USUARIO_DE_PRUEBA.id };

beforeAll(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
  limpiarModulos();
  registrarModulos(modulos);
});

describe("tools/list · portal_trabajador", () => {
  it("incluye las herramientas del portal cuando el módulo está activo", () => {
    const esperadas = [
      "portal_trabajador_mis_datos_obtener",
      "portal_trabajador_mis_datos_actualizar",
      "preview_portal_trabajador_mis_datos_actualizar",
      "portal_trabajador_preferencias_notificacion_obtener",
      "portal_trabajador_preferencias_notificacion_actualizar",
      "preview_portal_trabajador_preferencias_notificacion_actualizar",
      "portal_trabajador_privacidad_obtener",
      "portal_trabajador_arco_listar",
      "portal_trabajador_arco_solicitar",
      "preview_portal_trabajador_arco_solicitar",
      "portal_trabajador_mis_datos_exportar",
    ];
    const nombres = herramientasMcp(contextoOwnerAgente()).map((h) => h.nombre);
    expect(nombres).toEqual(expect.arrayContaining(esperadas));
  });

  it("no lista herramientas del portal si el módulo está inactivo", () => {
    const nombres = herramientasMcp(
      contextoDePrueba({ rol: "owner", actor: agente, scopes: ["*"], modulosActivos: ["core", "crm"] })
        .ctx,
    ).map((h) => h.nombre);
    expect(nombres).not.toContain("portal_trabajador_mis_datos_obtener");
  });

  it("requiere scope del módulo además de tenerlo activo", () => {
    const ctx = contextoDePrueba({
      rol: "owner",
      actor: agente,
      scopes: ["core"],
      modulosActivos: ["portal_trabajador"],
    }).ctx;
    expect(herramientasMcp(ctx).some((h) => h.capacidad.modulo === "portal_trabajador")).toBe(false);
  });
});
