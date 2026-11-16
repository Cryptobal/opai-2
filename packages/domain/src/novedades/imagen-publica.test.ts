import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { catalogoNovedades } from "./catalogo";

const publicChangelog = join(process.cwd(), "../../apps/web/public/changelog");

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