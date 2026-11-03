import { describe, expect, it, vi } from "vitest";

import { leerArgumentos, MENSAJE_SIN_DRY_RUN } from "../../scripts/importar-opai1/argumentos";
import { estadoVacio } from "../../scripts/importar-opai1/destino-tipos";
import { type Dependencias, ejecutar } from "../../scripts/importar-opai1/ejecutar";
import { lectorApiOpai1, lectorFixtures, validarDatos } from "../../scripts/importar-opai1/origen";
import { RUTA_FIXTURE } from "./memoria";

/** Todo dato personal o identificable del fixture: nada de esto puede salir en el reporte. */
const PROHIBIDOS = [
  "Ana",
  "Prueba",
  "Bruno",
  "Ficticio",
  "Carla",
  "Inventada",
  "Diego",
  "Demo",
  "Elena",
  "Fabio",
  "ejemplo.test",
  "@",
  "+569",
  "8765",
  "1111",
  "76111111",
  "76.111.111",
  "76.222.222",
  "76333333",
  "Comercial Alfa",
  "Inmobiliaria Beta",
  "Gamma Servicios",
  "Delta Log",
  "Calle Falsa",
  "Bodega",
  "Gerenta",
  "-33.45",
  "-70.65",
];

function deps(estado = estadoVacio()) {
  const salida: string[] = [];
  const d: Dependencias = {
    lector: (o) => (o.tipo === "fixtures" ? lectorFixtures(o.ruta) : lectorApiOpai1()),
    estadoDestino: vi.fn(async (slug: string) => (slug === "gard" ? { estado } : null)),
    escribir: vi.fn(async (_ruta: string, contenido: string) => {
      salida.push(contenido);
    }),
    log: (t) => salida.push(t),
    error: (t) => salida.push(t),
  };
  return { d, salida };
}

const ARGS = ["--dry-run", "--tenant", "gard", "--origen", `fixtures:${RUTA_FIXTURE}`];

describe("reporte y CLI de la simulación", () => {
  it("se niega sin --dry-run (y con --aplicar) y no lee nada", async () => {
    for (const argv of [ARGS.slice(1), [...ARGS, "--aplicar"]]) {
      const { d, salida } = deps();
      expect(await ejecutar(argv, d)).toBe(2);
      expect(salida.join("\n")).toContain(MENSAJE_SIN_DRY_RUN);
      expect(d.estadoDestino).not.toHaveBeenCalled();
    }
    expect(MENSAJE_SIN_DRY_RUN).toMatch(/OK explícito de Carlos/);
  });

  it("valida argumentos", () => {
    expect(leerArgumentos(["--dry-run", "--tenant", "gard"])).toMatchObject({
      ok: false,
      codigo: 64,
    });
    expect(leerArgumentos(["--dry-run", "--tenant", "gard", "--origen", "s3:x"])).toMatchObject({
      ok: false,
    });
    expect(leerArgumentos([...ARGS, "--salida", "r.json"])).toMatchObject({
      ok: true,
      args: { dryRun: true, tenant: "gard", salida: "r.json" },
    });
  });

  it("el reporte y el resumen no llevan datos personales: solo conteos e IDs", async () => {
    const { d, salida } = deps();
    expect(await ejecutar([...ARGS, "--salida", "reporte.json"], d)).toBe(0);
    const texto = salida.join("\n");
    for (const p of PROHIBIDOS) expect(texto, `filtra «${p}»`).not.toContain(p);
    const reporte = JSON.parse(salida.find((s) => s.startsWith("{")) ?? "{}");
    expect(reporte.modo).toBe("simulacion");
    expect(reporte.conteos.cuenta).toEqual({
      crear: 5,
      actualizar: 0,
      sin_cambios: 0,
      conflicto: 0,
      omitido: 1,
    });
    expect(reporte.conteos.contacto.conflicto).toBe(0);
    expect(texto).toContain("persona_unica_vinculo");
    expect(texto).toContain("con-c5");
  });

  it("tenant inexistente y lector de 1.0 sin configurar fallan cerrados", async () => {
    const { d } = deps();
    expect(
      await ejecutar(["--dry-run", "--tenant", "otro", "--origen", `fixtures:${RUTA_FIXTURE}`], d),
    ).toBe(1);
    await expect(
      ejecutar(["--dry-run", "--tenant", "gard", "--origen", "opai1"], d),
    ).rejects.toThrow(/no configurado/);
  });

  it("un origen inválido se rechaza sin mostrar valores", () => {
    expect(() =>
      validarDatos({ accounts: [{ id: "x", name: "Persona Secreta", rut: 5 }] }),
    ).toThrow(/accounts\.0\.rut/);
    try {
      validarDatos({ accounts: [{ id: "x", name: "Persona Secreta", rut: 5 }] });
    } catch (e) {
      expect(String(e)).not.toContain("Persona Secreta");
    }
  });
});
