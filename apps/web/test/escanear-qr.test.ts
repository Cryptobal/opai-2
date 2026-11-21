import { afterEach, describe, expect, it, vi } from "vitest";

import { lectorDisponible } from "../app/(terreno)/terreno/_componentes/escanear-qr";

afterEach(() => vi.unstubAllGlobals());

describe("lector QR de portería", () => {
  it("conserva el ingreso manual en servidor y en navegadores sin lector o cámara", () => {
    vi.stubGlobal("window", undefined);
    expect(lectorDisponible()).toBe(false);

    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", { mediaDevices: {} });
    expect(lectorDisponible()).toBe(false);

    vi.stubGlobal("window", { BarcodeDetector: class {} });
    vi.stubGlobal("navigator", {});
    expect(lectorDisponible()).toBe(false);
  });

  it("ofrece el lector cuando el navegador trae detector y acceso a cámara", () => {
    vi.stubGlobal("window", { BarcodeDetector: class {} });
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: () => Promise.resolve({}) } });
    expect(lectorDisponible()).toBe(true);
  });
});
