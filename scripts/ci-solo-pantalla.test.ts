import { describe, expect, it } from "vitest";

import {
  archivoSoloPantalla,
  diffSoloPantalla,
} from "./ci-solo-pantalla";

describe("ci-solo-pantalla", () => {
  it("acepta UI, e2e, DS y entradas de novedad", () => {
    expect(archivoSoloPantalla("apps/web/app/(erp)/cuentas/page.tsx")).toBe(true);
    expect(archivoSoloPantalla("apps/web/e2e/cuentas-preview.spec.ts")).toBe(true);
    expect(archivoSoloPantalla("packages/ds/src/components/button.tsx")).toBe(true);
    expect(
      archivoSoloPantalla(
        "packages/domain/src/novedades/entradas/2026-11-21-ui.md",
      ),
    ).toBe(true);
  });

  it("rechaza db, capabilities, auth, módulos, workflows y prisma", () => {
    expect(archivoSoloPantalla("packages/db/prisma/schema/core.prisma")).toBe(false);
    expect(archivoSoloPantalla("packages/capabilities/src/core/foo.ts")).toBe(
      false,
    );
    expect(archivoSoloPantalla("packages/auth/src/sesion.ts")).toBe(false);
    expect(archivoSoloPantalla("modules/tickets/capacidades/listar.ts")).toBe(
      false,
    );
    expect(archivoSoloPantalla(".github/workflows/ci.yml")).toBe(false);
    expect(
      archivoSoloPantalla("packages/db/prisma/migrations/20260101/init.sql"),
    ).toBe(false);
  });

  it("rechaza mezcla pantalla + lógica", () => {
    const archivos = [
      "apps/web/app/page.tsx",
      "packages/capabilities/src/foo.ts",
    ];
    expect(diffSoloPantalla(archivos)).toBe(false);
  });

  it("acepta diff solo de pantalla", () => {
    expect(
      diffSoloPantalla([
        "apps/web/app/page.tsx",
        "apps/web/e2e/menu-preview.spec.ts",
        "packages/ds/src/shell/nav.tsx",
      ]),
    ).toBe(true);
  });

  it("diff vacío no es solo pantalla", () => {
    expect(diffSoloPantalla([])).toBe(false);
  });
});