import { expect, it, vi } from "vitest";

const { ejecutar, setPendiente } = vi.hoisted(() => ({ ejecutar: vi.fn(), setPendiente: vi.fn() }));
vi.mock("react", () => ({ useRef: (current: unknown) => ({ current }), useState: () => [false, setPendiente] }));
vi.mock("@opai/ds", () => ({ Alerta: () => null }));
vi.mock("@/app/_components/use-capacidad", () => ({ useCapacidad: () => ({ ejecutar, error: null }) }));
vi.mock("@/app/(erp)/configuracion/_cpq/editor-bloques-propuesta", () => ({ EditorBloquesPropuesta: () => null }));

import { BloquesDeCotizacion } from "../app/(erp)/cotizaciones/[id]/propuesta-tecnica/_componentes/bloques-de-cotizacion";

it("no envía otra estructura hasta terminar la mutación y su recarga", async () => {
  let terminarMutacion!: (r: boolean) => void;
  let terminarRecarga!: () => void;
  ejecutar.mockImplementation(() => new Promise<boolean>((r) => { terminarMutacion = r; }));
  const recargar = vi.fn(() => new Promise<void>((r) => { terminarRecarga = r; }));
  const bloques = [{ id: "libre-a", tipo: "texto_libre", activo: true, fijo: false, opcional: true }];
  const vista = BloquesDeCotizacion({ propuestaId: "p", bloques, onGuardado: recargar });
  const cambiar = vista.props.children[1].props.onCambiar;
  cambiar(bloques);
  cambiar(bloques);
  expect(ejecutar).toHaveBeenCalledTimes(1);
  terminarMutacion(true);
  await vi.waitFor(() => expect(recargar).toHaveBeenCalledTimes(1));
  cambiar(bloques);
  expect(ejecutar).toHaveBeenCalledTimes(1);
  expect(setPendiente).not.toHaveBeenCalledWith(false);
  terminarRecarga();
  await vi.waitFor(() => expect(setPendiente).toHaveBeenLastCalledWith(false));
  cambiar(bloques);
  expect(ejecutar).toHaveBeenCalledTimes(2);
  terminarMutacion(false);
});

it("libera el bloqueo cuando la capacidad rechaza el cambio sin guardarlo", async () => {
  ejecutar.mockReset().mockResolvedValue(null);
  setPendiente.mockClear();
  const recargar = vi.fn(async () => {});
  const vista = BloquesDeCotizacion({ propuestaId: "p", bloques: [], onGuardado: recargar });
  const cambiar = vista.props.children[1].props.onCambiar;
  cambiar([]);
  await vi.waitFor(() => expect(setPendiente).toHaveBeenLastCalledWith(false));
  expect(recargar).not.toHaveBeenCalled();
  cambiar([]);
  expect(ejecutar).toHaveBeenCalledTimes(2);
});
