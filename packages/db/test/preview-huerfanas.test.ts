// Reglas del destrabe de la rama Neon de preview (workflow `preview`): solo ramas preview/pr-N y
// solo registros fallidos cuya migración ya no existe en el repo.
import { describe, expect, it } from "vitest";

import { fallidasHuerfanas, RAMA_PREVIEW } from "../scripts/preview-huerfanas-reglas";

const fila = (migration_name: string, terminada: boolean, revertida = false) => ({
  id: migration_name,
  migration_name,
  finished_at: terminada ? new Date() : null,
  rolled_back_at: revertida ? new Date() : null,
});

describe("destrabe de la rama Neon de preview", () => {
  it("solo acepta ramas preview/pr-N", () => {
    expect(RAMA_PREVIEW.test("preview/pr-469")).toBe(true);
    for (const r of ["main", "dev", "preview/pr-", "preview/pr-1/x", "x/preview/pr-1", ""]) {
      expect(RAMA_PREVIEW.test(r), r).toBe(false);
    }
  });

  it("marca solo las fallidas que ya no están en el repo", () => {
    const enRepo = new Set(["20261119100000_core_grupos_usuarios", "20261119120000_otra"]);
    const registros = [
      fila("20261119100000_core_grupos_usuarios", true),
      fila("20261119110000_core_grupos_usuarios", false),
      fila("20261119120000_otra", false),
      fila("20261101000000_vieja_revertida", false, true),
      fila("20261101000000_vieja_aplicada", true),
    ];
    expect(fallidasHuerfanas(registros, enRepo).map((r) => r.migration_name)).toEqual([
      "20261119110000_core_grupos_usuarios",
    ]);
  });
});
