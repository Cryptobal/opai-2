import { describe, expect, it } from "vitest";

import { conContadores } from "@/app/_components/nav-contadores";

const nav = [{ href: "/bandeja" }, { href: "/solicitudes" }, { href: "/negocios" }];

describe("números del menú (CAR-211)", () => {
  it("Solicitudes lleva el número y la alerta solo si hay nuevas; la Bandeja siempre su número", () => {
    const r = conContadores(nav, { bandejaContador: 0, solicitudesNuevas: 3 });
    expect(r[0]).toMatchObject({ href: "/bandeja", contador: 0 });
    expect(r[1]).toMatchObject({ href: "/solicitudes", contador: 3, alerta: true });
    expect(r[2]).toEqual({ href: "/negocios" });
  });
  it("sin solicitudes nuevas (o sin módulo, permiso o preferencias) no se muestra número", () => {
    expect(conContadores(nav, { bandejaContador: 2, solicitudesNuevas: 0 })[1]).toEqual({ href: "/solicitudes" });
    expect(conContadores(nav, undefined)[1]).toEqual({ href: "/solicitudes" });
  });
});
