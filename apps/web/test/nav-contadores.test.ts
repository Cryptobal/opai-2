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
    expect(conContadores(nav, { bandejaContador: 2, solicitudesNuevas: 0 })[1]).toEqual({
      href: "/solicitudes",
    });
    expect(conContadores(nav, undefined)[1]).toEqual({ href: "/solicitudes" });
  });
});

describe("Bandeja resaltada con pendientes (CAR-316, CAR-430)", () => {
  it("con solo avisos o aprobaciones también se resalta (decisión de Carlos, 11-nov)", () => {
    expect(conContadores(nav, { bandejaContador: 2, solicitudesNuevas: 0 })[0]).toEqual({
      href: "/bandeja",
      contador: 2,
      alerta: true,
      resaltado: true,
    });
  });
  it("sin nada pendiente vuelve al número discreto en 0, sin globo rojo", () => {
    expect(conContadores(nav, { bandejaContador: 0, solicitudesNuevas: 0 })[0]).toEqual({
      href: "/bandeja",
      contador: 0,
    });
  });
});

describe("punto rojo del avatar y del botón «Yo» (CAR-430)", () => {
  it("aparece con novedades sin leer en todos los portales, también en el ERP", () => {
    expect(avisoNovedadesAvatar(2)).toBe(true);
  });
  it("no aparece sin novedades pendientes", () => {
    expect(avisoNovedadesAvatar(0)).toBe(false);
  });
});
