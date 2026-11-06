// Gate de la política de retención (Ley 21.719, Brief 07d PR 3): el catálogo cubre exactamente las
// tablas del inventario, no manda borrar hechos regulados, y lo que decide Carlos (periodos y
// activación) es un ajuste del tenant que parte apagado y con los periodos como propuesta.
import { POLITICA_RETENCION, reglasDelTrabajo, reglasPendientes } from "@opai/domain";
import { describe, expect, it } from "vitest";

import { listarAjustes } from "../src/core/config/catalogo";
import { claveAjusteRetencion } from "../src/core/config/nucleo-retencion";
import { INVENTARIO_NUCLEO } from "../src/core/cumplimiento/inventario";
import { trabajosCumplimiento } from "../src/core/cumplimiento";
import { obtenerCapacidad, limpiarRegistro, registrarCapacidades } from "../src";
import { capacidadesDelNucleo } from "../src";

describe("catálogo de retención frente al inventario", () => {
  const tablasInventario = INVENTARIO_NUCLEO.map((d) => d.tabla).sort();

  it("cada tabla del inventario del Núcleo tiene su regla y viceversa", () => {
    expect(POLITICA_RETENCION.map((r) => r.tabla).sort()).toEqual(tablasInventario);
  });

  it("un hecho regulado (ADR-023) nunca se elimina: se conserva o, a lo más, se anonimiza", () => {
    for (const d of INVENTARIO_NUCLEO.filter((x) => x.reguladoNoBorrable)) {
      const r = POLITICA_RETENCION.find((x) => x.tabla === d.tabla);
      expect(r?.accion, d.tabla).not.toBe("eliminar");
    }
    for (const r of POLITICA_RETENCION.filter((x) => x.gestion === "regulado"))
      expect(r.accion, r.tabla).toBe("conservar");
  });

  it("la categoría de la regla es una de las declaradas para esa tabla", () => {
    for (const r of POLITICA_RETENCION) {
      const d = INVENTARIO_NUCLEO.find((x) => x.tabla === r.tabla);
      expect(d?.categorias, r.tabla).toContain(r.categoria);
    }
  });
});

describe("ajustes de la política", () => {
  const ajustes = listarAjustes().filter((a) => a.modulo === "core");

  it("la política parte APAGADA: nada se anonimiza hasta que Carlos confirme", () => {
    const activa = ajustes.find((a) => a.clave === "cumplimiento_retencion_activa");
    expect(activa?.schema.parse(undefined)).toBe(false);
    expect(activa?.meta).toMatchObject({ ambito: "tenant", permiso: "core:cumplimiento.manage" });
  });

  it("cada regla del trabajo tiene su ajuste de días, con la propuesta por defecto", () => {
    for (const r of reglasDelTrabajo()) {
      const a = ajustes.find((x) => x.clave === claveAjusteRetencion(r.clave));
      expect(a, r.clave).toBeDefined();
      expect(a?.schema.parse(undefined)).toBe(r.diasPropuestos);
      expect(a?.meta.ayuda).toMatch(/Plazo propuesto/);
    }
  });

  it("las categorías pendientes son configurables y parten APAGADAS (0), solo personas (CAR-39)", () => {
    expect(reglasPendientes().map((r) => r.clave).sort()).toEqual(
      [
        "aprobaciones",
        "credenciales_terreno",
        "cuentas",
        "documentos",
        "gasto_agente_mes",
        "personas_contacto_laboral",
        "personas_pago_solicitudes",
        "personas_uniforme",
        "representantes",
        "sesiones",
        "usuarios",
      ],
    );
    for (const r of reglasPendientes()) {
      const a = ajustes.find((x) => x.clave === claveAjusteRetencion(r.clave));
      expect(a?.schema.parse(undefined), r.clave).toBe(0);
      expect(a?.meta).toMatchObject({ ambito: "tenant", permiso: "core:cumplimiento.manage", soloPersonas: true });
      expect(a?.meta.ayuda).toMatch(/Plazo por definir/);
    }
  });
});

describe("registro", () => {
  it("el trabajo es diario y está en el Núcleo", () => {
    expect(trabajosCumplimiento.map((t) => ({ tipo: t.tipo, p: t.periodicidad }))).toEqual([
      { tipo: "core.cumplimiento.retencion", p: "diaria" },
    ]);
  });

  it("la política se lee (lectura, para agentes) y la anonimización puntual es solo de personas", () => {
    limpiarRegistro();
    registrarCapacidades(capacidadesDelNucleo);
    const lectura = obtenerCapacidad("core.cumplimiento.retencion_politica");
    const purga = obtenerCapacidad("core.cumplimiento.titular_anonimizar");
    expect(lectura?.efecto).toBe("lectura");
    expect(lectura?.soloPersonas).toBeFalsy();
    expect(purga).toMatchObject({ efecto: "escritura", dryRun: true, soloPersonas: true });
  });
});
