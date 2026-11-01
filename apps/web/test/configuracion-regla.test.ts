import { describe, expect, it } from "vitest";

import { tienePermiso } from "@opai/domain";

import { GRUPOS, GRUPOS_IDS } from "@/app/(erp)/configuracion/_centro/grupos";
import { SECCIONES } from "@/app/(erp)/configuracion/_centro/secciones";

/**
 * Regla del Centro de Configuración (REGLA §5, brief §9.1). Falla si alguien rompe el modelo de
 * grupos: más de 7 entradas por grupo (salvo Módulos), un grupo fuera de la lista cerrada, una
 * entrada sin permiso, Preferencias dentro de Configuración, un `platform:*` en una entrada, o que
 * Supervisor/Visualizador por defecto vean Agentes, Aprobaciones, Integraciones o Consumos.
 */
const sinTildes = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const ETIQUETA = new Map(GRUPOS.map((g) => [g.id, g.etiqueta]));

/** Entradas que Supervisor y Visualizador nunca ven (REGLA §3.8, brief §7). */
const VEDADAS = ["agentes", "aprobaciones", "integraciones", "consumos"];

describe("regla del centro de Configuración", () => {
  it("la lista de grupos es cerrada (máx. 6) y sin ids repetidos", () => {
    expect(GRUPOS_IDS.length).toBeLessThanOrEqual(6);
    expect(new Set(GRUPOS_IDS).size).toBe(GRUPOS_IDS.length);
  });

  it("toda entrada declara un grupo de la lista cerrada", () => {
    for (const s of SECCIONES)
      expect(GRUPOS_IDS as readonly string[], s.id).toContain(s.grupo);
  });

  it("ningún grupo salvo Módulos pasa de 7 entradas", () => {
    for (const g of GRUPOS) {
      if (g.id === "modulos") continue; // Excepción (REGLA §1.3): la lista propia con buscador.
      const n = SECCIONES.filter((s) => s.grupo === g.id).length;
      expect(n, g.id).toBeLessThanOrEqual(7);
    }
  });

  it("toda entrada declara un permiso no vacío (nunca null)", () => {
    for (const s of SECCIONES) {
      expect(typeof s.permiso, s.id).toBe("string");
      expect(s.permiso.length, s.id).toBeGreaterThan(0);
    }
  });

  it("ninguna entrada usa un permiso platform:*", () => {
    for (const s of SECCIONES) expect(s.permiso.startsWith("platform:"), s.id).toBe(false);
  });

  it("Preferencias no está en el registro de Configuración", () => {
    expect(SECCIONES.some((s) => s.id === "preferencias")).toBe(false);
    expect(SECCIONES.some((s) => s.href === "/configuracion/preferencias")).toBe(false);
  });

  it("Supervisor y Visualizador por defecto no ven Agentes, Aprobaciones, Integraciones ni Consumos", () => {
    for (const rol of ["supervisor", "viewer"] as const) {
      const visibles = SECCIONES.filter((s) => tienePermiso(rol, s.permiso)).map((s) => s.id);
      for (const id of VEDADAS) expect(visibles, `${rol} / ${id}`).not.toContain(id);
    }
  });

  it("cada entrada es encontrable por su título con el buscador de entradas", () => {
    for (const s of SECCIONES) {
      const haystack = sinTildes(`${s.titulo} ${s.descripcion} ${ETIQUETA.get(s.grupo) ?? ""}`);
      expect(haystack.includes(sinTildes(s.titulo)), s.id).toBe(true);
    }
  });
});
