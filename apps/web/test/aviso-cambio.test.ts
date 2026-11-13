import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const accion = vi.hoisted(() => vi.fn());
vi.mock("@/app/_acciones/capacidad", () => ({ ejecutarCapacidad: accion }));

import { EVENTO_CAMBIO, ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";

// CAR-338: lo que el navegador pide aparte (hilo, campana, números) se pone al día tras escribir.
const avisos = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", new EventTarget());
  window.addEventListener(EVENTO_CAMBIO, avisos);
  accion.mockReset();
  avisos.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("aviso de cambio tras una acción", () => {
  it("una escritura real avisa una vez, aunque sean varias seguidas", async () => {
    accion.mockResolvedValue({ ok: true, data: {}, dryRun: false, escritura: true });
    await ejecutarCapacidad("erp", "core.users.invite", {});
    await ejecutarCapacidad("erp", "core.users.invite", {});
    expect(avisos).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(avisos).toHaveBeenCalledTimes(1);
  });

  it("una lectura, un error o una preferencia propia no avisan", async () => {
    accion.mockResolvedValueOnce({ ok: true, data: {}, dryRun: false });
    await ejecutarCapacidad("erp", "core.personas.list", {});
    accion.mockResolvedValueOnce({ ok: false, error: { code: "FORBIDDEN", message: "no" } });
    await ejecutarCapacidad("erp", "core.users.invite", {});
    accion.mockResolvedValueOnce({ ok: true, data: {}, dryRun: false, escritura: true });
    await ejecutarCapacidad("erp", "core.preferencias.set", {}, false, "ninguna");
    vi.runAllTimers();
    expect(avisos).not.toHaveBeenCalled();
  });

  it("pasa los mismos argumentos a la acción de servidor", async () => {
    accion.mockResolvedValue({ ok: true, data: 1, dryRun: true });
    await expect(
      ejecutarCapacidad("erp", "x.y.z", { a: 1 }, true, "layout", "k"),
    ).resolves.toMatchObject({ data: 1 });
    expect(accion).toHaveBeenCalledWith("erp", "x.y.z", { a: 1 }, true, "layout", "k");
  });
});
