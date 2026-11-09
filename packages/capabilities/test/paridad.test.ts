import { beforeAll, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { modulos } from "../../../modules/registry/src";
import { registrarModulos, limpiarModulos } from "../src/module";
import { herramientasMcp } from "../src/mcp";
import {
  limpiarRegistro,
  listarCapacidades,
  obtenerCapacidad,
  registrarCapacidades,
} from "../src/registry";
import { EXCEPCIONES_PARIDAD } from "./paridad-excepciones";
import {
  capacidadesSinHerramienta,
  contextoOwnerAgente,
  llamadasAEjecutores,
  importadoresDeDb,
  INFRAESTRUCTURA_CON_DB,
  INTERNAS_PERMITIDAS,
  nombresDeHerramientas,
} from "./paridad-util";

// Gate de paridad UI↔MCP (ADR-004, ADR-034 §4): el MCP debe poder hacer todo lo que hace la pantalla.
beforeAll(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
  limpiarModulos();
  registrarModulos(modulos);
});

describe("paridad: toda capacidad tiene herramienta MCP", () => {
  it("lo que no aparece en tools/list es exactamente la lista de excepciones con motivo", () => {
    expect(capacidadesSinHerramienta()).toEqual(Object.keys(EXCEPCIONES_PARIDAD).sort());
  });

  it("cada excepción es interna o solo personas y tiene motivo", () => {
    for (const [id, motivo] of Object.entries(EXCEPCIONES_PARIDAD)) {
      const c = obtenerCapacidad(id);
      expect(c, `${id} no existe en el registro`).toBeDefined();
      expect(
        Boolean(c?.interna) || Boolean(c?.soloPersonas),
        `${id} no es interna ni soloPersonas`,
      ).toBe(true);
      expect(motivo.length, `${id} sin motivo`).toBeGreaterThan(20);
    }
  });

  it("toda escritura tiene su preview_ y las lecturas no", () => {
    const nombres = new Set(nombresDeHerramientas());
    for (const h of herramientasMcp(contextoOwnerAgente()).filter((x) => !x.dryRun)) {
      const preview = `preview_${h.nombre}`;
      expect(nombres.has(preview), h.nombre).toBe(h.capacidad.efecto !== "lectura");
    }
  });

  it("ninguna capacidad de plataforma se expone a una key de tenant", () => {
    expect(nombresDeHerramientas().filter((n) => n.includes("platform_"))).toEqual([]);
  });
});

describe("paridad: la UI solo invoca capacidades existentes y públicas", () => {
  it("todo id literal pasado a un ejecutor existe en el registro y no es interno", () => {
    const permitidas = new Set(INTERNAS_PERMITIDAS.map((p) => p.archivo));
    // Este registro solo tiene el núcleo; los ids de módulos (comercial.*, etc.) los valida el gate
    // del registro completo en apps/web/test/paridad-registro.test.ts.
    const delNucleo = (id: string) => id.startsWith("core.") || id.startsWith("platform.");
    const problemas = llamadasAEjecutores().flatMap(({ archivo, ids }) =>
      ids.flatMap((id) => {
        const c = obtenerCapacidad(id);
        if (!c) return delNucleo(id) ? [`${archivo}: "${id}" no existe en el registro`] : [];
        if (c.interna && !permitidas.has(archivo)) return [`${archivo}: "${id}" es interna`];
        return [];
      }),
    );
    expect(problemas).toEqual([]);
  });

  it("el escáner encuentra las llamadas (no pasa en vacío) y las dinámicas son solo las conocidas", () => {
    const llamadas = llamadasAEjecutores();
    expect(llamadas.filter((l) => l.ids.length > 0).length).toBeGreaterThan(50);
    // Pasarelas genéricas (reciben el id por parámetro) y ayudantes locales que no son ejecutores.
    const conocidas = new Set([
      "app/_acciones/capacidad.ts",
      "app/_components/use-capacidad.ts",
      "lib/servidor.ts",
      "app/(auth)/invitacion/[slug]/[token]/invitacion.tsx",
      "app/(platform)/platform/_componentes/hoja-trabajo.tsx",
      "app/_acciones/terreno-asistencia.ts", // pasarela del equipo para Asistencia: lista blanca de ids literales en el archivo
      "app/_components/asistencia/use-ejecutor.ts", // ejecutor de la pantalla de marcación: recibe el id literal de su llamador
      "lib/terreno-servidor.ts", // pasarela del equipo emparejado: recibe el id literal de sus llamadores
      "app/_components/maestros/acciones-entidad.tsx",
    ]);
    const nuevas = llamadas.filter((l) => l.ids.length === 0 && !conocidas.has(l.archivo));
    expect(
      nuevas.map((l) => l.archivo),
      "id de capacidad dinámico no permitido: pasa el id literal al ejecutor (o agrega el archivo a `conocidas` con motivo)",
    ).toEqual([]);
  });

  it("las internas permitidas siguen usándose en su archivo (sin entradas obsoletas)", () => {
    const usadas = new Set(
      llamadasAEjecutores()
        .filter(({ ids }) => ids.some((id) => obtenerCapacidad(id)?.interna))
        .map((x) => x.archivo),
    );
    for (const p of INTERNAS_PERMITIDAS) expect(usadas.has(p.archivo), p.archivo).toBe(true);
  });

  it("solo la infraestructura de la lista importa @opai/db en apps/web/app", () => {
    expect(importadoresDeDb()).toEqual(INFRAESTRUCTURA_CON_DB.map((a) => a.archivo).sort());
  });
});

describe("paridad: instantánea de herramientas", () => {
  it("los nombres de las herramientas MCP no cambian sin que se vea en el diff", async () => {
    const texto = `${nombresDeHerramientas().join("\n")}\n`;
    await expect(texto).toMatchFileSnapshot("./__snapshots__/herramientas-mcp.txt");
  });

  it("el registro del núcleo tiene capacidades de lectura y escritura", () => {
    expect(listarCapacidades().length).toBe(
      capacidadesDelNucleo.length + modulos.reduce((n, m) => n + m.capacidades.length, 0),
    );
  });
});
