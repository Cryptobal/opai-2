import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Identidad } from "@/lib/actor";
import { membresia } from "./fuentes-falsas";

// Brief 17: la página `/entrar` conecta la sesión y el equipo emparejado con su destino.
const estado = vi.hoisted(() => ({
  identidad: null as Identidad | null,
  equipo: null as { estado: string } | null,
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

function identidad(
  portales: string[],
  extra: {
    rol?: string;
    instalaciones?: string[] | null;
    personaVinculada?: boolean;
    modulosActivos?: string[];
  } = {},
): Identidad {
  const actual = membresia({ portales, rol: extra.rol ?? "owner" });
  return {
    usuario: {
      id: "u1",
      nombre: "U",
      email: "u@example.test",
      platformRole: null,
    },
    mfaActiva: false,
    actual,
    membresias: [actual],
    modulosActivos: extra.modulosActivos ?? ["portal_trabajador"],
    acceso: {
      permisosRol: null,
      excepciones: [],
      instalaciones: extra.instalaciones ?? null,
    },
    personaVinculada: extra.personaVinculada ?? portales.includes("trabajador"),
  };
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
    estado.identidad = identidad(["supervisor"], { rol: "supervisor", instalaciones: [] });
    estado.equipo = { estado: "activo" };
    expect(await destino()).toBe("/supervisor");
  });

  it("con varios portales usa el guardado o muestra el selector", async () => {
    estado.identidad = identidad(["erp", "supervisor"], { rol: "supervisor", instalaciones: [] });
    expect(await destino()).toBe("selector");
    estado.portal = "supervisor";
    expect(await destino()).toBe("/supervisor");
  });

  it("contacto de cliente entra directo al Portal Cliente", async () => {
    estado.identidad = identidad(["cliente"], { rol: "viewer", instalaciones: ["i1"] });
    expect(await destino()).toBe("/cliente");
  });
});