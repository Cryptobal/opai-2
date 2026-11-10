import { describe, expect, it, vi } from "vitest";

import { cargaRepetible } from "@/app/_components/carga-repetible";
import { urlConHoja } from "@/lib/hoja-url";

describe("urlConHoja (abrir una hoja sin viaje al servidor, CAR-209)", () => {
  it("agrega el parámetro conservando ruta, filtros y ancla", () => {
    expect(urlConHoja("https://test.opai.cl/solicitudes/abc?estado=nueva#x", "convertir")).toBe(
      "/solicitudes/abc?estado=nueva&convertir=1#x",
    );
  });
  it("no duplica el parámetro si ya está", () => {
    expect(urlConHoja("/solicitudes/abc?convertir=1", "convertir")).toBe("/solicitudes/abc?convertir=1");
  });
});

describe("cargaRepetible (chunk que falla tras un despliegue, CAR-209)", () => {
  it("devuelve el módulo si carga a la primera, sin reintentar", async () => {
    const cargar = vi.fn().mockResolvedValue("modulo");
    await expect(cargaRepetible(cargar, 1)).resolves.toBe("modulo");
    expect(cargar).toHaveBeenCalledTimes(1);
  });
  it("reintenta una vez y entrega el módulo si el segundo intento resulta", async () => {
    const cargar = vi.fn().mockRejectedValueOnce(new Error("chunk 404")).mockResolvedValue("modulo");
    await expect(cargaRepetible(cargar, 1)).resolves.toBe("modulo");
    expect(cargar).toHaveBeenCalledTimes(2);
  });
  it("rechaza tras el segundo fallo y no guarda el rechazo: otra llamada vuelve a intentar", async () => {
    const cargar = vi.fn().mockRejectedValue(new Error("chunk 404"));
    await expect(cargaRepetible(cargar, 1)).rejects.toThrow("chunk 404");
    expect(cargar).toHaveBeenCalledTimes(2);
    cargar.mockResolvedValue("modulo");
    await expect(cargaRepetible(cargar, 1)).resolves.toBe("modulo");
    expect(cargar).toHaveBeenCalledTimes(3);
  });
});
