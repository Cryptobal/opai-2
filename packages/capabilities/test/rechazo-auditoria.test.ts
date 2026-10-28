import { beforeEach, expect, it, vi } from "vitest";
import { executeCapability } from "../src";
import { contextoDePrueba } from "../src/testing";
import { reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

it("conserva el mensaje FORBIDDEN y registra el fallo de auditoría del rechazo", async () => {
  const { ctx } = contextoDePrueba();
  const sin = { ...ctx, autorizar: (p: string) => p !== "core:estructuras.read_sensible" };
  sin.auditoria.registrar = async () => {
    throw new Error("auditoría caída");
  };
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const r = await executeCapability(sin, "core.cargos.create", {
      nombre: "Cargo",
      sueldoSensible: true,
    });
    expect(r).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN", message: "No tienes permiso para crear un cargo sensible." },
    });
    expect(log).toHaveBeenCalledWith("No se pudo auditar el rechazo sensible");
  } finally {
    log.mockRestore();
  }
});
