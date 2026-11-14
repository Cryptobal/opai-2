import { describe, expect, it } from "vitest";

import { accesoDeRuta, novedadesVisibles, type AccesoRuta, type EntradaNovedad } from "./catalogo";

const TABLA: AccesoRuta[] = [
  { href: "/documentos", modulo: "core", permiso: "core:documentos.read" },
  { href: "/documentos/firmas", modulo: "core", permiso: "core:firmas.read" },
  { href: "/negocios", modulo: "comercial", permiso: "comercial:negocios.read" },
  { href: "/", modulo: "core", permiso: null },
];

const entrada = (id: string, ruta: string | null, extra: Partial<EntradaNovedad> = {}): EntradaNovedad => ({
  id,
  fecha: "2026-11-14",
  modulo: "core",
  titulo: "t",
  descripcion: "d",
  ruta,
  car: null,
  permiso: null,
  imagen: null,
  destacada: false,
  ...extra,
});

describe("accesoDeRuta (CAR-430)", () => {
  it("elige el prefijo más largo e ignora la consulta", () => {
    expect(accesoDeRuta("/documentos/firmas?x=1", TABLA)?.permiso).toBe("core:firmas.read");
    expect(accesoDeRuta("/documentos/abc", TABLA)?.permiso).toBe("core:documentos.read");
  });

  it("no confunde prefijos parciales ni usa la raíz", () => {
    expect(accesoDeRuta("/documentosx", TABLA)).toBeUndefined();
    expect(accesoDeRuta("/mi-cuenta", TABLA)).toBeUndefined();
  });
});

describe("novedadesVisibles por pantalla (CAR-430)", () => {
  const items = [
    entrada("firmas", "/documentos/firmas"),
    entrada("negocios", "/negocios/123"),
    entrada("cuenta", "/mi-cuenta"),
    entrada("sin-ruta", null),
  ];

  it("muestra solo las novedades de las pantallas que la persona ve", () => {
    const puede = (p: string) => p === "core:firmas.read";
    const ids = novedadesVisibles(items, ["comercial"], puede, false, TABLA).map((e) => e.id);
    expect(ids).toEqual(["firmas", "cuenta", "sin-ruta"]);
  });

  it("esconde la novedad de un módulo apagado aunque la persona tenga el permiso", () => {
    const ids = novedadesVisibles(items, [], () => true, false, TABLA).map((e) => e.id);
    expect(ids).not.toContain("negocios");
  });

  it("el permiso propio de la entrada manda sobre el de la pantalla", () => {
    const conPermiso = [entrada("propia", "/negocios", { permiso: "core:x" })];
    const ids = novedadesVisibles(conPermiso, [], (p) => p === "core:x", false, TABLA).map((e) => e.id);
    expect(ids).toEqual(["propia"]);
  });
});
