import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { catalogoNovedades } from "./catalogo";

const raizRepo = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const publicChangelog = join(raizRepo, "apps/web/public/changelog");

describe("novedades · imagen pública (CAR-520)", () => {
  it("cada entrada con imagen tiene el PNG en apps/web/public/changelog", () => {
    for (const e of catalogoNovedades()) {
      if (!e.imagen) continue;
      expect(e.imagen).toMatch(/^\/changelog\/[^/]+\.png$/);
      const archivo = join(publicChangelog, e.imagen.replace(/^\/changelog\//, ""));
      expect(existsSync(archivo), `${e.id} → ${archivo}`).toBe(true);
    }
  });
});