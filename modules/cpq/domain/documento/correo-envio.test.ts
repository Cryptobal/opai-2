import { describe, expect, it } from "vitest";

import { elegirAdjuntos, TOPE_ADJUNTOS_BYTES, textoAcceso, textoAdjuntos, type PdfEnvio } from "./correo-envio";

const MB = 1024 * 1024;
const cot = (mb: number): PdfEnvio => ({ clave: "cotizacion", nombre: "cotizacion.pdf", bytes: mb * MB });
const prop = (mb: number): PdfEnvio => ({ clave: "propuesta", nombre: "propuesta.pdf", bytes: mb * MB });

describe("elegirAdjuntos (límite del proveedor de correo)", () => {
  it("adjunta los dos PDF si la suma cabe", () => {
    const r = elegirAdjuntos([cot(2), prop(3)]);
    expect(r.adjuntar.map((p) => p.clave)).toEqual(["cotizacion", "propuesta"]);
    expect(r.enlazar).toEqual([]);
  });
  it("si la suma supera el tope, adjunta la cotización y enlaza la propuesta", () => {
    const r = elegirAdjuntos([cot(2), prop(TOPE_ADJUNTOS_BYTES / MB)]);
    expect(r.adjuntar.map((p) => p.clave)).toEqual(["cotizacion"]);
    expect(r.enlazar.map((p) => p.clave)).toEqual(["propuesta"]);
  });
  it("justo en el tope todavía adjunta todo", () => {
    const r = elegirAdjuntos([cot(8), prop(10)]);
    expect(r.adjuntar).toHaveLength(2);
  });
  it("sin propuesta técnica vinculada, solo la cotización", () => {
    const r = elegirAdjuntos([cot(1)]);
    expect(r.adjuntar.map((p) => p.clave)).toEqual(["cotizacion"]);
  });
  it("si ni la cotización cabe sola, nada se adjunta y todo se enlaza", () => {
    const r = elegirAdjuntos([cot(19), prop(1)]);
    expect(r.adjuntar).toEqual([]);
    expect(r.enlazar).toHaveLength(2);
  });
});

describe("textos del correo", () => {
  it("lista adjuntos y enlaces", () => {
    const t = textoAdjuntos(["Cotización CPQ-1.pdf"], [{ nombre: "Propuesta técnica", url: "https://x/y" }]);
    expect(t).toContain("- Cotización CPQ-1.pdf (adjunto)");
    expect(t).toContain("- Propuesta técnica: https://x/y");
    expect(t).toContain("7 días");
  });
  it("sin nada que listar, vacío", () => expect(textoAdjuntos([], [])).toBe(""));
  it("primera vez: pasos para entrar y a quién escribir", () => {
    const t = textoAcceso("invitado", { url: "https://t/cliente", comercial: "ventas@gard.cl" });
    expect(t).toContain("la primera vez");
    expect(t).toContain("https://t/cliente");
    expect(t).toContain("ventas@gard.cl");
    expect(textoAcceso("invitacion_pendiente", { url: "u", comercial: "" })).toContain("responde este correo");
  });
  it("quien ya tiene acceso no recibe la invitación", () => {
    const t = textoAcceso("ya_tiene_acceso", { url: "https://t/cliente", comercial: "" });
    expect(t).not.toContain("primera vez");
    expect(t).toContain("https://t/cliente");
  });
  it("sin acceso (no aplica) no habla del portal", () => expect(textoAcceso("no_aplica", { url: "u", comercial: "" })).toBe(""));
});
