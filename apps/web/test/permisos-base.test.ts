import { describe, expect, it } from "vitest";

import { catalogoPermisos, listarCapacidades } from "@opai/capabilities";
import { CLASES_BASE, coincide, tienePermiso } from "@opai/domain";

import { asegurarRegistro } from "../lib/registro";
import catalogoCongelado from "./permisos-base-catalogo-13nov.json";
import { PREVIOS } from "./permisos-base-previos";

// CAR-350/CAR-387 (Estándares P-1): gerente, lector y supervisor reciben solo lo que está clasificado, y todo permiso del
// catálogo real (núcleo + módulos registrados) tiene que tener su clase. Un permiso nuevo sin clase
// hace fallar esta prueba: alguien decide, en el PR, si gerente, lector y supervisor lo reciben.
asegurarRegistro();

type RolBase = "gerente" | "viewer" | "supervisor";

const previo = (rol: RolBase, p: string) =>
  !PREVIOS[rol].denegar.some((x) => coincide(x, p)) &&
  PREVIOS[rol].permitir.some((x) => coincide(x, p));

describe("roles base gerente, lector y supervisor por lista explícita (CAR-350, CAR-387)", () => {
  const catalogo = catalogoPermisos();

  it("todo permiso del catálogo está clasificado", () => {
    expect(catalogo.filter((p) => !(p in CLASES_BASE))).toEqual([]);
  });

  it("la clasificación no tiene permisos que ya no existen", () => {
    const vigentes = new Set(catalogo);
    expect(Object.keys(CLASES_BASE).filter((p) => !vigentes.has(p))).toEqual([]);
  });

  // Solo sobre los permisos que existían al pasar a lista (13-nov-2026): los que lleguen después se
  // clasifican por decisión explícita, no por la regla vieja de «todo menos…».
  it("la matriz de gerente, lector y supervisor es la misma que con los patrones anteriores", () => {
    for (const rol of ["gerente", "viewer", "supervisor"] as const) {
      const distintos = (catalogoCongelado as string[]).filter(
        (p) => tienePermiso(rol, p) !== previo(rol, p),
      );
      expect({ rol, distintos }).toEqual({ rol, distintos: [] });
    }
  });

  it("toda capacidad pide un permiso del catálogo (salvo plataforma, que no sale de roles de empresa)", () => {
    const vigentes = new Set(catalogo);
    const fuera = listarCapacidades()
      .map((c) => c.permiso)
      .filter(
        (p): p is string => typeof p === "string" && !p.startsWith("platform:") && !vigentes.has(p),
      );
    expect(fuera).toEqual([]);
  });

  it("un permiso desconocido no se concede a gerente ni a lector", () => {
    expect(tienePermiso("gerente", "comercial:algo_nuevo")).toBe(false);
    expect(tienePermiso("viewer", "comercial:algo_nuevo.read")).toBe(false);
  });

  it("un permiso nuevo de Operaciones, Rondas, Pauta o Tickets no se concede solo al supervisor", () => {
    for (const p of ["ops:exportar", "rondas:borrar", "pauta:exportar", "tickets:tickets.borrar"]) {
      expect({ p, concedido: tienePermiso("supervisor", p) }).toEqual({ p, concedido: false });
    }
  });
});
