import { readdirSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { CargaFallida, datosSiHayPermiso, exigirDatos } from "@/lib/carga";
import { DIGEST_CARGA_FALLIDA, DIGEST_SIN_ACCESO } from "@/lib/carga-digest";
import { estadoPantalla } from "@/lib/formato";

const ok = <T>(data: T) => ({ ok: true as const, data });
const falla = (code: string) => ({ ok: false as const, error: { code, message: "detalle técnico" } });

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

  it("lanza CargaFallida con un digest que distingue «sin permisos» sin exponer el mensaje", () => {
    const capturar = (code: string) => {
      try {
        exigirDatos(falla(code));
      } catch (e) {
        return e;
      }
      throw new Error("no lanzó");
    };
    const sinAcceso = capturar("FORBIDDEN");
    expect(sinAcceso).toBeInstanceOf(CargaFallida);
    expect((sinAcceso as CargaFallida).digest).toBe(DIGEST_SIN_ACCESO);
    const caida = capturar("INTERNAL") as CargaFallida;
    expect(caida.digest).toBe(DIGEST_CARGA_FALLIDA);
    expect(caida.message).not.toContain("detalle técnico");
  });

  it("sin el permiso de la sección usa el defecto; otro fallo lanza (no se ve como vacío)", () => {
    expect(datosSiHayPermiso(falla("FORBIDDEN"), [])).toEqual([]);
    expect(() => datosSiHayPermiso(falla("INTERNAL"), [])).toThrow(CargaFallida);
  });
});

describe("límites de error por portal", () => {
  const app = fileURLToPath(new URL("../app/", import.meta.url));
  const grupos = readdirSync(app).filter((d) => /^\(.+\)$/.test(d));

  it.each(grupos)("%s tiene su error.tsx con el estado del DS", (grupo) => {
    const ruta = `${app}${grupo}/error.tsx`;
    expect(existsSync(ruta)).toBe(true);
    const codigo = readFileSync(ruta, "utf8");
    expect(codigo.startsWith('"use client";')).toBe(true);
    expect(codigo).toContain("ErrorDiferido");
  });

  it("global-error.tsx existe, en español y con su propio <html>", () => {
    const codigo = readFileSync(`${app}global-error.tsx`, "utf8");
    expect(codigo).toContain('lang="es-CL"');
    expect(codigo).toContain("ErrorDiferido");
  });

  it("PantallaError usa ErrorState o Forbidden según el digest, con «Reintentar»", () => {
    const codigo = readFileSync(`${app}_components/pantalla-error.tsx`, "utf8");
    expect(codigo).toMatch(/DIGEST_SIN_ACCESO\) return <Forbidden/);
    expect(codigo).toContain("<ErrorState");
    expect(codigo).toContain("Reintentar");
  });
});
