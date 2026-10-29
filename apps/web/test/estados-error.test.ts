import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { notFound, redirect } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CargaFallida,
  datosSiHayPermiso,
  exigirDatos,
  falloDeCarga,
  hrefReintento,
} from "@/lib/carga";
import { estadoPantalla } from "@/lib/formato";

const ok = <T>(data: T) => ({ ok: true as const, data });
const falla = (code: string) => ({
  ok: false as const,
  error: { code, message: "detalle técnico" },
});
const capturar = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e;
  }
  throw new Error("no lanzó");
};

afterEach(() => vi.restoreAllMocks());

describe("estadoPantalla (CAR-50)", () => {
  it("listo solo si todas las cargas salieron bien", () => {
    expect(estadoPantalla(ok([]))).toBe("ready");
    expect(estadoPantalla(ok(1), ok(2))).toBe("ready");
  });

  it("un fallo es «error», nunca vacío", () => {
    expect(estadoPantalla(falla("INTERNAL"))).toBe("error");
    expect(estadoPantalla(ok([]), falla("INVALID_OUTPUT"))).toBe("error");
  });

  it("FORBIDDEN es «sin permisos» y gana sobre otros fallos", () => {
    expect(estadoPantalla(falla("FORBIDDEN"))).toBe("forbidden");
    expect(estadoPantalla(falla("INTERNAL"), falla("FORBIDDEN"))).toBe("forbidden");
  });
});

describe("exigirDatos y datosSiHayPermiso", () => {
  it("devuelve los datos de una carga exitosa", () => {
    expect(exigirDatos(ok([1, 2]))).toEqual([1, 2]);
    expect(datosSiHayPermiso(ok("x"), null)).toBe("x");
  });

  it("lanza CargaFallida con el código, sin el mensaje del servidor", () => {
    const e = capturar(() => exigirDatos(falla("INTERNAL")));
    expect(e).toBeInstanceOf(CargaFallida);
    expect((e as CargaFallida).code).toBe("INTERNAL");
    expect((e as CargaFallida).message).not.toContain("detalle técnico");
  });

  it("sin el permiso de la sección usa el defecto; otro fallo lanza (no se ve como vacío)", () => {
    expect(datosSiHayPermiso(falla("FORBIDDEN"), [])).toEqual([]);
    expect(() => datosSiHayPermiso(falla("INTERNAL"), [])).toThrow(CargaFallida);
  });
});

describe("falloDeCarga: lo que muestra PaginaPortal cuando cargar lanza", () => {
  it("FORBIDDEN → sin permisos; cualquier otro fallo → error (y queda en el log)", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(falloDeCarga(new CargaFallida("FORBIDDEN"))).toBe("forbidden");
    expect(falloDeCarga(new CargaFallida("INTERNAL"))).toBe("error");
    expect(falloDeCarga(new Error("se cayó la base"))).toBe("error");
    expect(log).toHaveBeenCalledTimes(2);
  });

  it("404 y redirecciones de Next se vuelven a lanzar, no se convierten en error", () => {
    const n = capturar(() => notFound());
    expect(() => falloDeCarga(n)).toThrow();
    const r = capturar(() => redirect("/login"));
    expect(() => falloDeCarga(r)).toThrow();
  });
});

describe("hrefReintento", () => {
  it("conserva la ruta y sus parámetros y agrega la marca", () => {
    expect(hrefReintento("/configuracion/empresa", "123")).toBe(
      "/configuracion/empresa?reintento=123",
    );
    expect(hrefReintento("/personas?q=ana", "9")).toBe("/personas?q=ana&reintento=9");
  });

  it("nunca sale del sitio: `//` o `/\\` iniciales se reducen a una sola barra", () => {
    expect(hrefReintento("//evil.example/x", "1")).toBe("/evil.example/x?reintento=1");
    expect(hrefReintento("/\\evil.example", "1")).toBe("/evil.example?reintento=1");
    expect(hrefReintento("", "1")).toBe("/?reintento=1");
  });
});

describe("PaginaPortal y ErrorCarga", () => {
  const leer = (ruta: string) =>
    readFileSync(fileURLToPath(new URL(`../app/_components/${ruta}`, import.meta.url)), "utf8");

  it("PaginaPortal atrapa el fallo de cargar y muestra ErrorCarga dentro del shell", () => {
    const codigo = leer("pagina-portal.tsx");
    expect(codigo).toContain("fallo = falloDeCarga(e)");
    expect(codigo).toContain("<ErrorCarga fallo={fallo}");
  });

  it("ErrorCarga es de servidor (sin JS de cliente) y usa ErrorState o Forbidden con «Reintentar»", () => {
    const codigo = leer("error-carga.tsx");
    expect(codigo).not.toContain('"use client"');
    expect(codigo).toContain('if (fallo === "forbidden") return <Forbidden />');
    expect(codigo).toContain("<ErrorState");
    expect(codigo).toContain("Reintentar");
  });
});
