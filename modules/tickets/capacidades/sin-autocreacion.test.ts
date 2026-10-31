// REGLA OBLIGATORIA DE CARLOS (30-oct-2026 23:14): ningún ticket se crea solo. Un ticket nace
// únicamente cuando una persona lo crea a mano. Nada de reglas automáticas, hallazgos ni
// integraciones que generen tickets (BRIEF-13 §1, ADR-025). Este test lo garantiza de tres formas:
// (1) la única escritura de `ticket` en todo el código es la capacidad `tickets.tickets.crear`;
// (2) ningún consumidor de eventos ni trabajo programado la invoca o escribe tickets;
// (3) la capacidad exige una sesión de persona: sin usuario (sistema, trabajo, evento) no crea nada.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ACTIVOS, semilla, TIPO_ID } from "./fixtures";
import { capacidades } from "./index";

const RAIZ = join(import.meta.dirname, "../../..");
const OMITIR = new Set(["node_modules", ".next", ".turbo", "generated", "dist", "docs", "migrations"]);
const ESCRIBE_TICKET = /\bticket\.(create|createMany|upsert)\s*\(/;
const INVOCA_CREAR = /["'`]tickets\.tickets\.crear["'`]/;
const AUTORIZADOS = new Set(["modules/tickets/capacidades/escritura.ts"]);

function fuentes(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    if (OMITIR.has(nombre)) return [];
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return fuentes(ruta);
    return /\.(ts|tsx)$/.test(nombre) && !/\.(test|spec)\.tsx?$/.test(nombre) ? [ruta] : [];
  });
}

const codigo = ["apps", "packages", "modules"]
  .flatMap((d) => fuentes(join(RAIZ, d)))
  .map((ruta) => ({ ruta: relative(RAIZ, ruta), texto: readFileSync(ruta, "utf8") }));

beforeAll(() => {
  registrarCapacidades(capacidades);
});

describe("ningún ticket se crea solo", () => {
  it("la única escritura de tickets en el código es tickets.tickets.crear", () => {
    const escritores = codigo.filter((f) => ESCRIBE_TICKET.test(f.texto)).map((f) => f.ruta);
    expect(escritores).toEqual([...AUTORIZADOS]);
  });

  it("solo la pantalla (acción de usuario) invoca tickets.tickets.crear; nada de consumidores ni trabajos", () => {
    const automaticos = codigo.filter(
      (f) => /defineConsumidor|defineTrabajo|ctx\.trabajos|encolar/.test(f.texto) && INVOCA_CREAR.test(f.texto),
    );
    expect(automaticos.map((f) => f.ruta)).toEqual([]);
    const consumidoresTickets = codigo.filter(
      (f) => f.ruta.startsWith("modules/tickets/") && /defineConsumidor|defineTrabajo/.test(f.texto),
    );
    expect(consumidoresTickets.map((f) => f.ruta)).toEqual([]);
  });

  it("sin sesión de persona (sistema, evento o trabajo) la capacidad no crea nada", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, usuario: null });
    const input = { tipoId: TIPO_ID, titulo: "Fuga de agua", descripcion: "Hay una fuga cerca." };
    for (const dryRun of [false, true]) {
      const r = await executeCapability(ctx, "tickets.tickets.crear", input, { dryRun });
      expect(r.ok).toBe(false);
    }
    expect(await ctx.db.ticket.findMany({})).toHaveLength(0);
  });
});
