import { beforeEach, expect, it, vi } from "vitest";

const { consultar, cabeceras } = vi.hoisted(() => ({
  consultar: vi.fn(),
  cabeceras: vi.fn(),
}));
vi.mock("../src/auth", () => ({ auth: { api: { getSession: consultar } } }));
vi.mock("next/headers", () => ({ headers: cabeceras }));

import { sesionVigente } from "../src/session";

beforeEach(() => {
  consultar.mockReset();
  cabeceras.mockReset();
});

it("reconsulta sin caché ni renovación y observa una sesión revocada", async () => {
  const headers = new Headers({ cookie: "fixture-sintetico" });
  consultar.mockResolvedValueOnce({ user: { id: "fixture" } }).mockResolvedValueOnce(null);
  expect(await sesionVigente(headers)).toEqual({ user: { id: "fixture" } });
  expect(await sesionVigente(headers)).toBeNull();
  expect(consultar).toHaveBeenCalledTimes(2);
  expect(consultar).toHaveBeenLastCalledWith({
    headers,
    query: { disableCookieCache: true, disableRefresh: true },
  });
  expect(cabeceras).not.toHaveBeenCalled();
});

it("sin Request explícito usa las cabeceras actuales del servidor", async () => {
  const headers = new Headers();
  cabeceras.mockResolvedValue(headers);
  consultar.mockResolvedValue(null);
  await sesionVigente();
  expect(cabeceras).toHaveBeenCalledOnce();
  expect(consultar).toHaveBeenCalledWith({
    headers,
    query: { disableCookieCache: true, disableRefresh: true },
  });
});
