import { describe, expect, it } from "vitest";

import type { DatosInstalacion } from "@/app/(erp)/instalaciones/_componentes/campos-instalacion";
import { faltantesInstalacion } from "@/app/(erp)/instalaciones/_componentes/faltantes";

const inicialInstalacion = (): DatosInstalacion => ({
  nombre: "",
  direccion: null,
  geocercaM: "300",
  vigencia: { desde: "", hasta: "" },
  notas: "",
});

describe("faltantesInstalacion", () => {
  it("dice qué falta para crear", () => {
    expect(faltantesInstalacion(inicialInstalacion(), null)).toEqual([
      "elegir la cuenta",
      "escribir el nombre",
    ]);
  });
  it("queda vacío cuando está lista", () => {
    const d = { ...inicialInstalacion(), nombre: "Planta Norte" };
    expect(faltantesInstalacion(d, "c1")).toEqual([]);
  });
  it("avisa una vigencia invertida", () => {
    const d = {
      ...inicialInstalacion(),
      nombre: "Planta Norte",
      vigencia: { desde: "2026-10-01", hasta: "2026-09-01" },
    };
    expect(faltantesInstalacion(d, "c1")).toHaveLength(1);
  });
});
