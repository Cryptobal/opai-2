import { describe, expect, it } from "vitest";

import { destinoConSesion, destinoSinSesion } from "@/app/(entrada)/entrar/destino";
import { portalesVisibles } from "@/app/_components/portales";
import type { Identidad } from "@/lib/actor";
import { membresia } from "./fuentes-falsas";

function identidad(
  portales: string[],
  extra: {
    rol?: string;
    platformRole?: "owner" | "support" | null;
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
      platformRole: extra.platformRole ?? null,
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

function destino(portales: string[], preferido?: string, extra?: Parameters<typeof identidad>[1]) {
  return destinoConSesion(portalesVisibles(identidad(portales, extra)), preferido);
}

describe("/entrar lleva a cada perfil a su portal", () => {
  it("guardia → Portal Trabajador", () => expect(destino(["trabajador"])).toBe("/trabajador"));
  it("cliente → Portal Cliente", () =>
    expect(destino(["cliente"], undefined, { rol: "viewer", instalaciones: ["i"] })).toBe(
      "/cliente",
    ));
  it("supervisor → Portal Supervisor", () =>
    expect(destino(["supervisor"], undefined, { rol: "supervisor", instalaciones: [] })).toBe(
      "/supervisor",
    ));
  it("administrativo → ERP", () => expect(destino(["erp"])).toBe("/"));

  it("con varios portales y sin preferencia muestra el selector", () => {
    expect(destino(["erp", "supervisor"], undefined, { rol: "supervisor", instalaciones: [] })).toBeNull();
  });

  it("con varios portales usa el guardado en el dispositivo", () => {
    expect(
      destino(["erp", "supervisor"], "supervisor", { rol: "supervisor", instalaciones: [] }),
    ).toBe("/supervisor");
  });

  it("ignora un portal guardado al que ya no tiene acceso", () => {
    expect(destino(["trabajador"])).toBe("/trabajador");
    expect(destino(["trabajador"], "erp", { personaVinculada: true })).toBe("/trabajador");
    expect(destino(["erp", "cliente"], "platform", { rol: "admin" })).toBe("/");
  });

  it("el Portal Trabajador sin el módulo activo no cuenta", () => {
    expect(
      destinoConSesion(
        portalesVisibles(identidad(["trabajador"], { modulosActivos: [], personaVinculada: true })),
        undefined,
      ),
    ).toBe("/");
  });

  it("sin ningún portal va al Inicio, que explica qué falta", () => {
    expect(destino([])).toBe("/");
  });
});

describe("/entrar sin sesión", () => {
  it("un equipo de terreno emparejado entra a Terreno", () => {
    expect(destinoSinSesion({ estado: "activo" })).toBe("/terreno");
  });

  it("un equipo revocado vuelve a emparejar", () => {
    expect(destinoSinSesion({ estado: "revocado" })).toBe("/terreno/emparejar");
  });

  it("sin equipo va al ingreso y vuelve a /entrar", () => {
    expect(destinoSinSesion(null)).toBe("/login?next=%2Fentrar");
  });
});