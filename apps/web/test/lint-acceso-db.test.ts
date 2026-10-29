import { createRequire } from "node:module";
import { Linter, type Rule } from "eslint";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { accesoDb } = require("../../../scripts/lint-acceso-db.mjs") as {
  accesoDb: Rule.RuleModule;
};

function errores(code: string, archivo = "apps/web/lib/ejemplo.js") {
  return new Linter().verify(
    code,
    {
      files: ["**/*.js"],
      plugins: { opai: { rules: { frontera: accesoDb } } },
      rules: { "opai/frontera": "error" },
    },
    { filename: `${process.cwd()}/${archivo}` },
  );
}

describe("frontera global de base de datos", () => {
  it.each([
    'import { globales as libre } from "@opai/db";',
    'import { clienteAuth } from "@opai/db";',
    'import { clienteBloqueoLogin } from "@opai/db";',
    'import { borrarUsuario } from "@opai/db";',
    'import { restablecerSegundoFactor } from "@opai/db";',
    'import { ultimosAccesos } from "@opai/db";',
    'import { usuarioEnOtrasEmpresas } from "@opai/db";',
    'import { registrarEventoSeguridad } from "@opai/db";',
    'import { dbAdmin } from "@opai/db";',
    'import { accesoPlataforma } from "@opai/db";',
    'import * as db from "@opai/db";',
    'import db from "@opai/db";',
    'const db = await import("@opai/db");',
    'const db = require("@opai/db");',
    'export * from "@opai/db";',
    'export { globales as libre } from "@opai/db";',
  ])("rechaza accesos libres: %s", (codigo) => {
    expect(errores(codigo)).toHaveLength(1);
  });

  it("permite identidad mínima, auth y construcción del contexto autorizado", () => {
    expect(errores('import { tenantPorSlug, usuarioPorId } from "@opai/db";')).toEqual([]);
    expect(errores('import { clienteAuth } from "@opai/db";', "packages/auth/src/auth.js")).toEqual(
      [],
    );
    expect(errores('import { dbAdmin } from "@opai/db";', "packages/auth/scripts/seed.js")).toEqual(
      [],
    );
  });
});
