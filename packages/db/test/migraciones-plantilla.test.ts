// Plantilla de migración (CAR-47): toda migración posterior al corte abre con BEGIN y
// SET LOCAL lock_timeout, cierra con COMMIT y trae la sección «Reversión». Corre en `pnpm test`.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CORTE_PLANTILLA, EXENTAS, problemasDeMigracion } from "./migraciones-reglas";

const RAIZ = new URL("../prisma/", import.meta.url);
const migraciones = readdirSync(new URL("migrations/", RAIZ), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
const leer = (nombre: string) =>
  readFileSync(new URL(`migrations/${nombre}/migration.sql`, RAIZ), "utf8");

describe("plantilla de migración (CAR-47)", () => {
  it("la plantilla misma cumple las reglas", () => {
    expect(
      problemasDeMigracion(readFileSync(new URL("plantilla-migracion.sql", RAIZ), "utf8")),
    ).toEqual([]);
  });

  it("toda migración posterior al corte sigue la plantilla", () => {
    const fallas = migraciones
      .filter((m) => m.slice(0, 14) > CORTE_PLANTILLA)
      .map((m) => ({ m, problemas: problemasDeMigracion(leer(m)) }))
      .filter((f) => f.problemas.length > 0);
    expect(fallas, "copia packages/db/prisma/plantilla-migracion.sql").toEqual([]);
  });

  it("solo las migraciones listadas quedan exentas, y ninguna se fecha antes del corte", () => {
    const fuera = migraciones.filter((m) => m.slice(0, 14) <= CORTE_PLANTILLA && !EXENTAS.has(m));
    expect(fuera).toEqual([]);
    for (const m of EXENTAS) expect(m.slice(0, 14) <= CORTE_PLANTILLA).toBe(true);
  });

  it("toda migración trae su migration.sql", () => {
    expect(
      migraciones.filter((m) => !existsSync(new URL(`migrations/${m}/migration.sql`, RAIZ))),
    ).toEqual([]);
  });
});

describe("problemasDeMigracion", () => {
  const ok =
    "-- x\nBEGIN;\nSET LOCAL lock_timeout = '5s';\nSELECT 1;\nCOMMIT;\n-- Reversión: nada.\n";

  it("acepta la forma de la plantilla, también con bloques DO", () => {
    expect(problemasDeMigracion(ok)).toEqual([]);
    const conDo = ok.replace("SELECT 1;", () => "DO $$ BEGIN PERFORM 1; COMMIT; END $$;");
    expect(problemasDeMigracion(conDo)).toEqual([]);
  });

  it("rechaza sin BEGIN, sin SET LOCAL, con SET de sesión, sin COMMIT o sin reversión", () => {
    expect(problemasDeMigracion(ok.replace("BEGIN;", ""))).not.toEqual([]);
    expect(problemasDeMigracion(ok.replace("SET LOCAL lock_timeout = '5s';", ""))).not.toEqual([]);
    expect(problemasDeMigracion(ok.replace("SET LOCAL", "SET"))).not.toEqual([]);
    expect(problemasDeMigracion(ok.replace("COMMIT;", ""))).not.toEqual([]);
    expect(problemasDeMigracion(ok.replace("-- Reversión: nada.", ""))).not.toEqual([]);
    expect(problemasDeMigracion(ok.replace("-- Reversión: nada.", "-- Reversión:"))).not.toEqual(
      [],
    );
    // El SET LOCAL dentro de un comentario no cuenta.
    expect(problemasDeMigracion(ok.replace("SET LOCAL", "-- SET LOCAL"))).not.toEqual([]);
  });

  it("sin transacción solo con marca y motivo, SET de sesión y sin BEGIN/COMMIT", () => {
    const sinTx =
      "-- opai:sin-transaccion: CREATE INDEX CONCURRENTLY no corre en transacción\n" +
      "SET lock_timeout = '5s';\nCREATE INDEX CONCURRENTLY i ON t(c);\n-- Reversión: DROP INDEX CONCURRENTLY i;\n";
    expect(problemasDeMigracion(sinTx)).toEqual([]);
    expect(problemasDeMigracion(sinTx.replace("SET lock_timeout = '5s';", ""))).not.toEqual([]);
    expect(problemasDeMigracion(`BEGIN;\n${sinTx}COMMIT;\n`)).not.toEqual([]);
    expect(problemasDeMigracion(sinTx.replace(/: CREATE INDEX.*\n/, ": x\n"))).not.toEqual([]);
  });
});
