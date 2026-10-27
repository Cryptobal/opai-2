import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0, efectos: [] as (() => void)[], ejecutar: vi.fn(), revisar: vi.fn(), info: vi.fn(),
}));
// Ejercita la cola asíncrona real del hook, con estado conservado entre renders.
vi.mock("react", () => ({
  useCallback: <T>(f: T) => f,
  useEffect: (f: () => void) => h.efectos.push(f),
  useRef: (valor: unknown) => {
    const i = h.cursor++;
    if (!(i in h.slots)) h.slots[i] = { current: valor };
    return h.slots[i];
  },
  useState: (valor: unknown) => {
    const i = h.cursor++;
    if (!(i in h.slots)) h.slots[i] = valor;
    return [h.slots[i], (siguiente: unknown) => { h.slots[i] = siguiente; }];
  },
}));
vi.mock("@opai/ds", () => ({ avisar: { info: h.info, error: vi.fn() } }));
vi.mock("@/app/_acciones/capacidad", () => ({ ejecutarCapacidad: h.ejecutar }));
vi.mock("@/app/_acciones/validar-fichas-nav", () => ({ revisarFichasNav: h.revisar }));
import { type Fijado, useNavegacionArea } from "@/app/_components/use-navegacion-area";

function PreferenciasPrueba() { return useNavegacionArea("erp", true); }
function render() { h.cursor = 0; return PreferenciasPrueba(); }
type Escritura = { clave: string; valor: unknown; versionEsperada: number };
let escrituras: Escritura[];
let esperar: () => Promise<void>;

async function montar(fijados: Fijado[] = []) {
  h.ejecutar.mockImplementation(async (_portal: string, id: string, input: Escritura) => {
    if (id === "core.config.get") return { ok: true, data: [
      { clave: "navegacion_fijados", valor: fijados, version: 0 },
      { clave: "navegacion_area_abierta", valor: "clientes", version: 0 },
    ] };
    escrituras.push(input);
    await esperar();
    return { ok: true, data: { version: input.versionEsperada + 1 } };
  });
  render();
  h.efectos[0]?.();
  await vi.waitFor(() => expect(render().cargado).toBe(true));
  return render();
}

beforeEach(() => {
  h.slots = []; h.cursor = 0; h.efectos = []; h.ejecutar.mockReset();
  escrituras = []; esperar = async () => undefined;
  h.revisar.mockReset().mockResolvedValue({ validas: [], invalidas: [] });
  h.info.mockReset();
  vi.stubGlobal("window", new EventTarget());
});

describe("preferencias: transformaciones sobre la última respuesta confirmada", () => {
  it("dos fijados rápidos no se pierden aunque el primer guardado tarde", async () => {
    const prefs = await montar();
    let liberar = () => {};
    esperar = () => new Promise<void>((resolve) => { liberar = resolve; });
    const permitidos = ["/cuentas", "/instalaciones"];
    prefs.fijar({ tipo: "entrada", href: "/cuentas", etiqueta: "Cuentas" }, permitidos);
    prefs.fijar({ tipo: "entrada", href: "/instalaciones", etiqueta: "Instalaciones" }, permitidos);
    await vi.waitFor(() => expect(escrituras).toHaveLength(1));
    esperar = async () => undefined;
    liberar();
    await vi.waitFor(() => expect(render().fijados).toHaveLength(2));
    expect(escrituras[1]).toMatchObject({ versionEsperada: 1 });
    expect(render().fijados.map((f) => f.href)).toEqual(permitidos);
  });

  it("no borra fichas cuya validación visual esté pendiente o haya fallado", async () => {
    const ficha: Fijado = { tipo: "ficha", href: "/cuentas/0192f3a0-0000-7000-8000-000000000001",
      etiqueta: "Cuenta", fijadoEn: "2026-10-27T00:00:00.000Z" };
    const prefs = await montar([ficha]);
    prefs.fijar({ tipo: "entrada", href: "/personas", etiqueta: "Personas" }, ["/personas"]);
    await vi.waitFor(() => expect(render().fijados).toHaveLength(2));
    expect(render().fijados[0]).toEqual(ficha);
  });

  it("no escribe por navegar dentro de la misma área ni por repetir un cambio encolado", async () => {
    const prefs = await montar();
    prefs.fijarAreaAbierta("clientes");
    prefs.fijarAreaAbierta("personas");
    prefs.fijarAreaAbierta("personas");
    await vi.waitFor(() => expect(render().areaAbierta).toBe("personas"));
    await Promise.resolve();
    expect(escrituras).toHaveLength(1);
    expect(escrituras[0]).toMatchObject({ valor: "personas", versionEsperada: 0 });
  });

  it("cinco fichas definitivamente inaccesibles liberan cupos al fijar una entrada", async () => {
    const fichas: Fijado[] = Array.from({ length: 5 }, (_, i) => ({ tipo: "ficha",
      href: `/cuentas/0192f3a0-0000-7000-8000-00000000000${i}`,
      etiqueta: "Cuenta", fijadoEn: "2026-10-27T00:00:00.000Z" }));
    const prefs = await montar(fichas);
    h.revisar.mockResolvedValue({ validas: [], invalidas: fichas.map((f) => f.href) });
    prefs.fijar({ tipo: "entrada", href: "/personas", etiqueta: "Personas" }, ["/personas"]);
    await vi.waitFor(() => expect(render().fijados.map((f) => f.href)).toEqual(["/personas"]));
  });

  it("no mezcla una lista antigua con la revisión recargada durante una validación demorada", async () => {
    const prefs = await montar();
    let liberar = () => {};
    h.revisar.mockImplementation(() => new Promise((resolve) => {
      liberar = () => resolve({ validas: [], invalidas: [] });
    }));
    prefs.fijar({ tipo: "entrada", href: "/personas", etiqueta: "Personas" }, ["/personas", "/cuentas"]);
    await vi.waitFor(() => expect(h.revisar).toHaveBeenCalled());
    const remotos = [{ tipo: "entrada", href: "/cuentas", etiqueta: "Cuentas", fijadoEn: "2026-10-27T00:00:00.000Z" }];
    h.ejecutar.mockResolvedValueOnce({ ok: true, data: [{ clave: "navegacion_fijados", valor: remotos, version: 1 }] });
    window.dispatchEvent(new Event("opai-preferencias-nav"));
    await vi.waitFor(() => expect(render().fijados).toEqual(remotos));
    liberar();
    await vi.waitFor(() => expect(h.info).toHaveBeenCalled());
    expect(escrituras).toHaveLength(0);
    expect(render().fijados).toEqual(remotos);
  });
});
