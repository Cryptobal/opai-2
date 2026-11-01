import { describe, expect, it } from "vitest";

import { manifest } from "./manifest";

describe("portal_trabajador · manifest", () => {
  it("todas las capacidades son del portal trabajador y no piden permiso (alcance = persona propia)", () => {
    for (const c of manifest.capacidades) {
      expect(c.id.startsWith("portal_trabajador.")).toBe(true);
      expect(c.portales).toEqual(["trabajador"]);
      expect(c.permiso).toBeNull();
    }
  });

  it("toda escritura admite vista previa y ninguna capacidad recibe un id de persona", () => {
    for (const c of manifest.capacidades) {
      if (c.efecto !== "lectura") expect(c.dryRun).toBe(true);
      const campos = Object.keys((c.input as unknown as { shape?: Record<string, unknown> }).shape ?? {});
      expect(campos.filter((k) => /^persona(_?id)?$/i.test(k))).toEqual([]);
    }
  });

  it("las lecturas de datos personales declaran su auditoría (NÚCLEO-H)", () => {
    for (const c of manifest.capacidades.filter((x) => x.efecto === "lectura"))
      expect(typeof c.auditarLectura).toBe("function");
  });

  it("el evento que emite está declarado en el manifest", () => {
    expect(manifest.eventos.map((e) => e.id)).toContain("portal_trabajador.mis_datos.actualizados");
  });
});
