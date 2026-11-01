import { describe, expect, it } from "vitest";

import { herramientasMcp } from "../src/mcp";
import { listarCapacidades } from "../src/registry";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";

const agente = { tipo: "agent" as const, id: "k-portal-pt", viaUserId: USUARIO_DE_PRUEBA.id };

const nombres = (modulos: string[]) =>
  herramientasMcp(
    contextoDePrueba({ rol: "owner", actor: agente, scopes: ["*"], modulosActivos: modulos }).ctx,
  ).map((h) => h.nombre);

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
    const modulos = [...new Set(listarCapacidades().map((c) => c.modulo))];
    expect(nombres(modulos)).toEqual(expect.arrayContaining(esperadas));
  });

  it("no lista herramientas del portal si el módulo está inactivo", () => {
    expect(nombres(["core", "crm"])).not.toContain("portal_trabajador_mis_datos_obtener");
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
