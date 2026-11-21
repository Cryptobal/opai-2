import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** Listas ERP que deben usar `PaginacionListaMaestro` (CAR-585). Personas usa su pie propio. */
const LISTAS_PAGINACION = [
  "app/(erp)/cotizaciones/_componentes/lista-cotizaciones.tsx",
  "app/(erp)/negocios/_componentes/lista-negocios.tsx",
  "app/(erp)/cuentas/_componentes/lista-cuentas.tsx",
  "app/(erp)/instalaciones/_componentes/lista-instalaciones.tsx",
  "app/(erp)/finanzas/ventas/_componentes/lista-ventas-maestro.tsx",
  "app/(erp)/finanzas/compras/_componentes/lista-compras-maestro.tsx",
] as const;

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("paginación lista maestro ERP (CAR-585)", () => {
  it("las listas adoptadas importan PaginacionListaMaestro", () => {
    for (const ruta of LISTAS_PAGINACION) {
      const texto = readFileSync(join(raiz, ruta), "utf8");
      expect(texto, ruta).toContain("PaginacionListaMaestro");
    }
  });
});