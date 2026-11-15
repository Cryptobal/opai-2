import { beforeEach, describe, expect, it, vi } from "vitest";

// Brief 17: la página `/entrar` conecta la sesión y el equipo emparejado con su destino.
const estado = vi.hoisted(() => ({
  identidad: null as unknown,
  equipo: null as unknown,
  portal: undefined as string | undefined,
}));

vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (estado.portal ? { value: estado.portal } : undefined),
  }),
}));
vi.mock("@/lib/servidor", () => ({ identidadActual: async () => estado.identidad }));
vi.mock("@/lib/dispositivo", () => ({ dispositivoActual: async () => estado.equipo }));
vi.mock("@/app/(entrada)/entrar/selector", () => ({ SelectorPortal: () => null }));

import { ContenidoEntrar } from "@/app/(entrada)/entrar/contenido";

function persona(portales: string[]) {
  return { usuario: { platformRole: null }, actual: { portales }, modulosActivos: [] };
}

async function destino(): Promise<string> {
  try {
    await ContenidoEntrar();
    return "selector";
  } catch (e) {
    return (e as Error).message.replace("REDIRECT:", "");
  }
}

describe("/entrar (página)", () => {
  beforeEach(() => {
    estado.identidad = null;
    estado.equipo = null;
    estado.portal = undefined;
  });

  it("un equipo emparejado sin sesión cae en Terreno", async () => {
    estado.equipo = { estado: "activo" };
    expect(await destino()).toBe("/terreno");
  });

  it("un equipo revocado vuelve a emparejar", async () => {
    estado.equipo = { estado: "revocado" };
    expect(await destino()).toBe("/terreno/emparejar");
  });

  it("sin sesión ni equipo va al ingreso", async () => {
    expect(await destino()).toBe("/login?next=%2Fentrar");
  });

  it("con sesión manda la sesión aunque haya equipo", async () => {
    estado.identidad = persona(["supervisor"]);
    estado.equipo = { estado: "activo" };
    expect(await destino()).toBe("/supervisor");
  });

  it("con varios portales usa el guardado o muestra el selector", async () => {
    estado.identidad = persona(["erp", "cliente"]);
    expect(await destino()).toBe("selector");
    estado.portal = "cliente";
    expect(await destino()).toBe("/cliente");
  });
});
