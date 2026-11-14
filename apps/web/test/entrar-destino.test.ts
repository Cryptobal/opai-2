import { describe, expect, it } from "vitest";

import { destinoConSesion, destinoSinSesion } from "@/app/(entrada)/entrar/destino";
import { portalesVisibles } from "@/app/_components/portales";

// Brief 17: la app nativa (y la PWA) abre `/entrar`, y cada perfil debe caer en su portal.
const conTrabajador = ["portal_trabajador"];

function destino(portales: string[], preferido?: string, plataforma = false) {
  return destinoConSesion(portalesVisibles(portales, plataforma, conTrabajador), preferido);
}

describe("/entrar lleva a cada perfil a su portal", () => {
  it("guardia → Portal Trabajador", () => expect(destino(["trabajador"])).toBe("/trabajador"));
  it("cliente → Portal Cliente", () => expect(destino(["cliente"])).toBe("/cliente"));
  it("supervisor → Portal Supervisor", () => expect(destino(["supervisor"])).toBe("/supervisor"));
  it("administrativo → ERP", () => expect(destino(["erp"])).toBe("/"));

  it("con varios portales y sin preferencia muestra el selector", () => {
    expect(destino(["erp", "supervisor"])).toBeNull();
  });

  it("con varios portales usa el guardado en el dispositivo", () => {
    expect(destino(["erp", "supervisor"], "supervisor")).toBe("/supervisor");
  });

  it("ignora un portal guardado al que ya no tiene acceso", () => {
    expect(destino(["trabajador"], "erp")).toBe("/trabajador");
    expect(destino(["erp", "cliente"], "platform")).toBeNull();
  });

  it("el Portal Trabajador sin el módulo activo no cuenta", () => {
    expect(destinoConSesion(portalesVisibles(["trabajador"], false, []), undefined)).toBe("/");
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
