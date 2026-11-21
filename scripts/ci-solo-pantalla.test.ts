import { describe, expect, it } from "vitest";

import {
  archivoSoloPantalla,
  diffSoloPantalla,
  diffTieneUseServerAgregado,
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

  it("rechaza lógica de novedades fuera de entradas", () => {
    expect(
      archivoSoloPantalla("packages/domain/src/novedades/acceso-ruta.ts"),
    ).toBe(false);
  });

  it("rechaza api, route, lib, acciones y config en apps/web", () => {
    expect(
      archivoSoloPantalla("apps/web/app/api/v1/[...capability]/route.ts"),
    ).toBe(false);
    expect(archivoSoloPantalla("apps/web/lib/acceso-portal.ts")).toBe(false);
    expect(archivoSoloPantalla("apps/web/app/_acciones/auth.ts")).toBe(false);
    expect(archivoSoloPantalla("apps/web/app/firmar/acciones.ts")).toBe(false);
    expect(archivoSoloPantalla("apps/web/next.config.ts")).toBe(false);
    expect(archivoSoloPantalla("apps/web/package.json")).toBe(false);
  });

  it("rechaza db, capabilities, auth, módulos, github y prisma", () => {
    expect(archivoSoloPantalla("packages/db/prisma/schema/core.prisma")).toBe(
      false,
    );
    expect(archivoSoloPantalla("packages/capabilities/src/core/foo.ts")).toBe(
      false,
    );
    expect(archivoSoloPantalla(".github/scripts/ci-solo-pantalla.sh")).toBe(
      false,
    );
    expect(
      archivoSoloPantalla("packages/db/prisma/migrations/20260101/init.sql"),
    ).toBe(false);
  });

  it("rechaza rename db→web con --no-renames (ambos paths)", () => {
    expect(
      diffSoloPantalla([
        "packages/db/prisma/migrations/2027_x/migration.sql",
        "apps/web/m.sql",
      ]),
    ).toBe(false);
    expect(
      diffSoloPantalla([
        "packages/capabilities/src/guard.ts",
        "apps/web/guard.ts",
      ]),
    ).toBe(false);
  });

  it("rechaza borrado o cambio solo en ruta bloqueada", () => {
    expect(diffSoloPantalla(["packages/capabilities/src/guard.ts"])).toBe(
      false,
    );
    expect(diffSoloPantalla(["packages/db/test/rls-nucleo.test.ts"])).toBe(
      false,
    );
  });

  it("rechaza migración aunque haya pantalla", () => {
    expect(
      diffSoloPantalla([
        "apps/web/app/page.tsx",
        "packages/db/prisma/migrations/20260101/x/migration.sql",
      ]),
    ).toBe(false);
  });

  it("rechaza tests guardia de acceso", () => {
    expect(
      archivoSoloPantalla("apps/web/test/lint-acceso-db.test.ts"),
    ).toBe(false);
    expect(archivoSoloPantalla("apps/web/test/revalidacion-acceso.test.ts")).toBe(
      false,
    );
    expect(archivoSoloPantalla("apps/web/test/permisos-ui.test.ts")).toBe(false);
    expect(archivoSoloPantalla("apps/web/test/modulos-vista.test.ts")).toBe(
      true,
    );
  });

  it("rechaza .tsx con use server agregado en el diff", () => {
    const diff = [
      "diff --git a/apps/web/app/foo/page.tsx b/apps/web/app/foo/page.tsx",
      "@@",
      "+'use server'",
      "+export async function guardar() {}",
    ].join("\n");
    expect(diffTieneUseServerAgregado(diff)).toBe(true);
    expect(
      archivoSoloPantalla("apps/web/app/foo/page.tsx", diff),
    ).toBe(false);
    expect(
      diffSoloPantalla(["apps/web/app/foo/page.tsx"], {
        "apps/web/app/foo/page.tsx": diff,
      }),
    ).toBe(false);
  });

  it("acepta .tsx sin use server en el diff", () => {
    const diff = "+export function Vista() { return null }\n";
    expect(
      archivoSoloPantalla("apps/web/app/foo/page.tsx", diff),
    ).toBe(true);
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