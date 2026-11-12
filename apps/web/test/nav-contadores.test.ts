import { describe, expect, it } from "vitest";

import { avisoNovedadesAvatar, conContadores } from "@/app/_components/nav-contadores";

const nav = [{ href: "/bandeja" }, { href: "/solicitudes" }, { href: "/negocios" }];

describe("números del menú (CAR-211)", () => {
  it("Solicitudes lleva el número y la alerta solo si hay nuevas; la Bandeja siempre su número", () => {
    const r = conContadores(nav, { bandejaContador: 0, solicitudesNuevas: 3 });
    expect(r[0]).toEqual({ href: "/bandeja", contador: 0 });
    expect(r[1]).toMatchObject({ href: "/solicitudes", contador: 3, alerta: true });
    expect(r[2]).toEqual({ href: "/negocios" });
  });
  it("sin solicitudes nuevas (o sin módulo, permiso o preferencias) no se muestra número", () => {
    expect(conContadores(nav, { bandejaContador: 2, solicitudesNuevas: 0 })[1]).toEqual({ href: "/solicitudes" });
    expect(conContadores(nav, undefined)[1]).toEqual({ href: "/solicitudes" });
  });
});

describe("Bandeja resaltada con novedades sin leer (CAR-316)", () => {
  it("suma las novedades sin leer al número de la Bandeja y la resalta", () => {
    const r = conContadores(nav, { bandejaContador: 2, solicitudesNuevas: 0 }, 3);
    expect(r[0]).toEqual({ href: "/bandeja", contador: 5, alerta: true, resaltado: true });
  });
  it("solo con novedades pendientes (sin avisos) la Bandeja también se resalta", () => {
    expect(conContadores(nav, { bandejaContador: 0, solicitudesNuevas: 0 }, 1)[0]).toMatchObject({
      contador: 1,
      alerta: true,
      resaltado: true,
    });
    expect(conContadores(nav, undefined, 4)[0]).toMatchObject({ contador: 4, resaltado: true });
  });
  it("con solo avisos o aprobaciones también se resalta (decisión de Carlos, 11-nov)", () => {
    expect(conContadores(nav, { bandejaContador: 2, solicitudesNuevas: 0 }, 0)[0]).toEqual({
      href: "/bandeja",
      contador: 2,
      alerta: true,
      resaltado: true,
    });
  });
  it("sin nada pendiente vuelve al número discreto en 0, sin globo rojo", () => {
    expect(conContadores(nav, { bandejaContador: 0, solicitudesNuevas: 0 }, 0)[0]).toEqual({
      href: "/bandeja",
      contador: 0,
    });
  });
});

describe("punto rojo del avatar en portales sin Bandeja (CAR-316)", () => {
  it("aparece con novedades sin leer en supervisor, trabajador, terreno, cliente y plataforma", () => {
    for (const portal of ["supervisor", "trabajador", "terreno", "cliente", "platform"])
      expect(avisoNovedadesAvatar(portal, 2), portal).toBe(true);
  });
  it("no aparece en el ERP (ahí está la Bandeja) ni sin novedades pendientes", () => {
    expect(avisoNovedadesAvatar("erp", 5)).toBe(false);
    expect(avisoNovedadesAvatar("supervisor", 0)).toBe(false);
  });
});
