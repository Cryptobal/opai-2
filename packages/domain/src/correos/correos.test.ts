import { describe, expect, it } from "vitest";

import {
  asociarCorreo,
  asuntoBase,
  correoDeDireccion,
  direccionBuzon,
  dominioDeSitio,
  esDireccionOpai,
  esDominioGenerico,
  generarTokenBuzon,
  tokenBuzonDeDireccion,
} from "./index";

// Empresas y contactos ficticios (sin datos de ningún cliente real).
const CUENTA_A = "00000000-0000-7000-8000-00000000000a";
const CUENTA_B = "00000000-0000-7000-8000-00000000000b";
const CONTACTO_A = "00000000-0000-7000-8000-0000000000c1";
const cuentas = [
  { id: CUENTA_A, sitioWeb: "https://www.cliente.cl" },
  { id: CUENTA_B, sitioWeb: "otra.cl/inicio" },
];
const contactos = [{ id: CONTACTO_A, email: "Ana@Cliente.cl", cuentaId: CUENTA_A }];

describe("direcciones del buzón", () => {
  it("genera un token «t» de 128 bits y lo reconoce en la dirección", () => {
    const t = generarTokenBuzon();
    expect(t).toMatch(/^t[0-9a-f]{32}$/);
    expect(tokenBuzonDeDireccion(`Registro <${direccionBuzon(t).toUpperCase()}>`)).toBe(t);
    expect(esDireccionOpai(direccionBuzon(t))).toBe(true);
  });
  it("no confunde el token de un seguimiento ni otro dominio", () => {
    expect(tokenBuzonDeDireccion("s0123456789abcdef0123456789abcdef@respuestas.opai.cl")).toBeNull();
    expect(tokenBuzonDeDireccion("t0123456789abcdef0123456789abcdef@otro.cl")).toBeNull();
    expect(tokenBuzonDeDireccion("t0123@respuestas.opai.cl")).toBeNull();
  });
  it("normaliza correos y descarta lo que no lo es", () => {
    expect(correoDeDireccion("Ana Pérez <ANA@cliente.cl>")).toBe("ana@cliente.cl");
    expect(correoDeDireccion("no es correo")).toBeNull();
  });
});

describe("dominioDeSitio", () => {
  it("toma el host y quita solo el www inicial", () => {
    expect(dominioDeSitio("https://www.cliente.cl")).toBe("cliente.cl");
    expect(dominioDeSitio("cliente.cl/contacto")).toBe("cliente.cl");
    expect(dominioDeSitio("http://ventas.cliente.cl")).toBe("ventas.cliente.cl");
    expect(dominioDeSitio("")).toBeNull();
    expect(dominioDeSitio("localhost")).toBeNull();
  });
});

describe("dominios genéricos", () => {
  it("Google, Microsoft y Yahoo con cualquier extensión de país", () => {
    for (const d of ["gmail.com", "outlook.com", "hotmail.com", "hotmail.cl", "live.cl", "yahoo.com", "yahoo.com.ar", "icloud.com"])
      expect(esDominioGenerico(d)).toBe(true);
    expect(esDominioGenerico("cliente.cl")).toBe(false);
  });
});

describe("asociarCorreo", () => {
  it("primero el correo exacto del contacto", () => {
    expect(asociarCorreo(["ana@cliente.cl"], contactos, cuentas)).toEqual({ tipo: "contacto", cuentaId: CUENTA_A, contactoId: CONTACTO_A });
  });
  it("si no, el dominio de sitioWeb (https://www.cliente.cl) y no otra cuenta", () => {
    expect(asociarCorreo(["Pedro <pedro@cliente.cl>"], contactos, cuentas)).toEqual({ tipo: "dominio", cuentaId: CUENTA_A });
    expect(asociarCorreo(["x@otra.cl"], contactos, cuentas)).toEqual({ tipo: "dominio", cuentaId: CUENTA_B });
  });
  it("gmail u outlook sin correo exacto quedan sin asignar", () => {
    const conGmail = [...cuentas, { id: "00000000-0000-7000-8000-00000000000c", sitioWeb: "gmail.com" }];
    expect(asociarCorreo(["alguien@gmail.com"], contactos, conGmail)).toEqual({ tipo: "sin_asignar", motivo: "generico" });
    expect(asociarCorreo(["alguien@outlook.com"], contactos, cuentas)).toEqual({ tipo: "sin_asignar", motivo: "generico" });
  });
  it("gmail con correo exacto de un contacto sí se asocia", () => {
    const c = [{ id: CONTACTO_A, email: "ana.personal@gmail.com", cuentaId: CUENTA_A }];
    expect(asociarCorreo(["ana.personal@gmail.com"], c, cuentas)).toMatchObject({ tipo: "contacto", cuentaId: CUENTA_A });
  });
  it("un dominio que calza con dos cuentas queda sin asignar", () => {
    const dos = [...cuentas, { id: "00000000-0000-7000-8000-00000000000d", sitioWeb: "cliente.cl" }];
    expect(asociarCorreo(["pedro@cliente.cl"], [], dos)).toEqual({ tipo: "sin_asignar", motivo: "ambiguo" });
  });
  it("subdominios no calzan (conservador mientras Carlos no decida)", () => {
    expect(asociarCorreo(["pedro@ventas.cliente.cl"], [], cuentas)).toEqual({ tipo: "sin_asignar", motivo: "sin_calce" });
  });
  it("contactos exactos de dos cuentas: sin asignar; de la misma: cuenta sin contacto", () => {
    const c2 = [...contactos, { id: "00000000-0000-7000-8000-0000000000c2", email: "b@otra.cl", cuentaId: CUENTA_B }];
    expect(asociarCorreo(["ana@cliente.cl", "b@otra.cl"], c2, cuentas)).toEqual({ tipo: "sin_asignar", motivo: "ambiguo" });
    const c3 = [...contactos, { id: "00000000-0000-7000-8000-0000000000c3", email: "luis@cliente.cl", cuentaId: CUENTA_A }];
    expect(asociarCorreo(["ana@cliente.cl", "luis@cliente.cl"], c3, cuentas)).toEqual({ tipo: "contacto", cuentaId: CUENTA_A, contactoId: null });
  });
  it("sin contraparte válida: sin asignar", () => {
    expect(asociarCorreo(["nada"], contactos, cuentas)).toEqual({ tipo: "sin_asignar", motivo: "sin_contraparte" });
  });
});

describe("asuntoBase", () => {
  it("quita prefijos de respuesta y reenvío repetidos", () => {
    expect(asuntoBase("RE: Rv: Fwd:  Cotización COT-12 ")).toBe("cotización cot-12");
    expect(asuntoBase(null)).toBe("");
  });
});
