import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "../proxy";

// Sin sesión, cada portal lleva a su ingreso (CAR-347): el trabajador entra con RUT y PIN.
const sinSesion = (ruta: string) =>
  new NextRequest(`http://localhost:3000${ruta}`, { headers: { accept: "text/html" } });
const destino = (r: Response) => new URL(r.headers.get("location") ?? "").pathname;
const siguiente = (r: Response) =>
  new URL(r.headers.get("location") ?? "").searchParams.get("next");

describe("proxy: ingreso según el portal", () => {
  it("una ruta del Portal Trabajador va a /trabajador/login con el destino", async () => {
    const r = await proxy(sinSesion("/trabajador/marcar"));
    expect(r.status).toBe(307);
    expect(destino(r)).toBe("/trabajador/login");
    expect(siguiente(r)).toBe("/trabajador/marcar");
  });

  it("el ERP sigue en /login, y la raíz sin `next`", async () => {
    const r = await proxy(sinSesion("/cuentas?estado=activo"));
    expect(destino(r)).toBe("/login");
    expect(siguiente(r)).toBe("/cuentas?estado=activo");
    const raiz = await proxy(sinSesion("/"));
    expect(destino(raiz)).toBe("/login");
    expect(siguiente(raiz)).toBeNull();
  });

  it("el Portal Cliente entra por el ingreso común", async () => {
    const r = await proxy(sinSesion("/cliente/cotizaciones"));
    expect(destino(r)).toBe("/login");
  });
});
