import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.doUnmock("@/app/_components/pwa/limpiar-cache");
  vi.resetModules();
});

it("si falta el chunk de limpieza, la acción de salida se ejecuta una sola vez", async () => {
  vi.doMock("@/app/_components/pwa/limpiar-cache", () => {
    throw new Error("chunk 404");
  });
  const { trasLimpiarCaches } = await import("@/app/_components/limpiar-cache-diferido");
  const accion = vi.fn();
  await trasLimpiarCaches(accion);
  expect(accion).toHaveBeenCalledTimes(1);
});

it("si descarga el chunk, delega en la limpieza antes de ejecutar la acción", async () => {
  const orden: string[] = [];
  vi.doMock("@/app/_components/pwa/limpiar-cache", () => ({
    trasLimpiarCaches: (accion: () => unknown) => {
      orden.push("limpieza");
      void accion();
    },
  }));
  const { trasLimpiarCaches } = await import("@/app/_components/limpiar-cache-diferido");
  await trasLimpiarCaches(() => orden.push("salida"));
  expect(orden).toEqual(["limpieza", "salida"]);
});
