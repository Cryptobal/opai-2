import { beforeEach, expect, it, vi } from "vitest";

const ejecutar = vi.fn();
vi.mock("@/lib/servidor", () => ({ ejecutarComoUsuario: (...a: unknown[]) => ejecutar(...a) }));

import { cargarVisitas } from "@/app/(erp)/instalaciones/_componentes/visitas/datos";
import { POR_PAGINA } from "@/app/_components/maestros/paginacion-cursor";

beforeEach(() => ejecutar.mockReset());

it("pide la primera página de 50 visitas sin usar el cursor de instalaciones", async () => {
  const resultado = { ok: true, data: { items: [], siguiente: "visitas-2" } };
  ejecutar.mockResolvedValue(resultado);
  expect(await cargarVisitas("instalacion-ficticia", { cursor: "instalaciones-2" })).toBe(resultado);
  expect(POR_PAGINA).toBe(50);
  expect(ejecutar).toHaveBeenCalledWith("erp", "pauta.visitas.listar", {
    instalacionId: "instalacion-ficticia", limite: 50,
  });
});

it("conserva el cursor propio de visitas en la segunda página", async () => {
  ejecutar.mockResolvedValue({ ok: true, data: { items: [], siguiente: null } });
  await cargarVisitas("instalacion-ficticia", { cursor: "instalaciones-2", vcursor: "visitas-2" });
  expect(ejecutar).toHaveBeenCalledWith("erp", "pauta.visitas.listar", {
    instalacionId: "instalacion-ficticia", limite: 50, cursor: "visitas-2",
  });
});
