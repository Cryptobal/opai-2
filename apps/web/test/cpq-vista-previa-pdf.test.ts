import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  efectos: [] as (() => void | (() => void))[],
  ejecutar: vi.fn(),
}));
// Estado conservado entre renders sin renderer de React (patrón de `navegacion-cola.test.ts`).
vi.mock("react", () => ({
  useCallback: <T>(f: T) => f,
  useEffect: (f: () => void | (() => void)) => void h.efectos.push(f),
  useRef: (valor: unknown) => {
    const i = h.cursor++;
    if (!(i in h.slots)) h.slots[i] = { current: valor };
    return h.slots[i];
  },
  useState: (valor: unknown) => {
    const i = h.cursor++;
    if (!(i in h.slots)) h.slots[i] = valor;
    return [h.slots[i], (s: unknown) => void (h.slots[i] = typeof s === "function" ? s(h.slots[i]) : s)];
  },
}));
vi.mock("@/app/_acciones/capacidad", () => ({ ejecutarCapacidad: h.ejecutar }));

import {
  MENSAJE_TIEMPO_PDF,
  TIEMPO_MAXIMO_PDF_MS,
  useVistaPreviaPdf,
} from "@/app/(erp)/cotizaciones/[id]/_componentes/use-vista-previa-pdf";

function VistaPreviaPrueba() {
  return useVistaPreviaPdf("cot-1");
}
function render() {
  h.cursor = 0;
  h.efectos = [];
  return VistaPreviaPrueba();
}
const correrEfecto = () => h.efectos.at(-1)?.();

beforeEach(() => {
  h.slots = [];
  h.ejecutar.mockReset();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("vista previa del PDF (CAR-162)", () => {
  it("muestra el error del servidor y no queda en «Generando»", async () => {
    h.ejecutar.mockResolvedValue({ ok: false, error: { code: "UNPROCESSABLE", message: "Fallo del PDF" } });
    render();
    correrEfecto();
    await vi.runAllTicks();
    await Promise.resolve();
    const r = render();
    expect(r.estado.fase).toBe("error");
    expect(r.mensaje).toBe("Fallo del PDF");
    expect(h.ejecutar).toHaveBeenCalledTimes(1);
  });

  it("a los 20 s muestra el aviso de demora y «Reintentar» vuelve a pedir", async () => {
    h.ejecutar.mockReturnValue(new Promise(() => {}));
    render();
    correrEfecto();
    vi.advanceTimersByTime(TIEMPO_MAXIMO_PDF_MS);
    const r = render();
    expect(r.mensaje).toBe(MENSAJE_TIEMPO_PDF);
    r.reintentar();
    expect(render().estado.fase).toBe("generando");
    correrEfecto();
    expect(h.ejecutar).toHaveBeenCalledTimes(2);
  });

  it("con PDF termina en listo con la URL", async () => {
    h.ejecutar.mockResolvedValue({ ok: true, data: { pdfBase64: "QUJD", bytes: 24_000 } });
    render();
    correrEfecto();
    await vi.runAllTicks();
    await Promise.resolve();
    const r = render();
    expect(r.estado).toEqual({ fase: "listo", pdfUrl: "data:application/pdf;base64,QUJD", paginas: 2 });
    expect(r.mensaje).toBeNull();
  });
});
