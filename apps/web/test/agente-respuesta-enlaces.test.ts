import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HiloAgente } from "@/app/_components/agente/hilo-agente";
import type { Mensaje, ReferenciaEntidad } from "@/app/_components/agente/tipos";

const cuenta: ReferenciaEntidad = {
  id: "11111111-1111-1111-1111-111111111111",
  titulo: "Acme SpA",
  detalle: "76.123.456-7",
  campos: ["76.123.456-7", "Cliente"],
  estado: "activa",
  href: "/cuentas/11111111-1111-1111-1111-111111111111",
};
const cotiz: ReferenciaEntidad = {
  id: "22222222-2222-2222-2222-222222222222",
  titulo: "Cotización 12",
  detalle: "Enviada",
  href: "/cotizaciones/22222222-2222-2222-2222-222222222222",
};

const html = (mensajes: Mensaje[]) =>
  renderToStaticMarkup(createElement(HiloAgente, { mensajes, onDecidir: () => undefined }));

describe("respuesta del agente con enlaces y tarjetas (CAR-446)", () => {
  it("pinta markdown, enlaces permitidos y tarjeta Abrir; bloquea URLs ajenas", () => {
    const h = html([
      {
        id: "1",
        rol: "agente",
        texto: `La cuenta [Acme SpA](${cuenta.href}) tiene:\n\n- [Cotización 12](${cotiz.href})\n- [malo](https://evil.example/x)\n\n**Resumen** listo.`,
        referencias: [cuenta, cotiz],
      },
    ]);
    expect(h).toContain(`href="${cuenta.href}"`);
    expect(h).toContain(`href="${cotiz.href}"`);
    expect(h).toContain("Abrir");
    expect(h).toContain("activa");
    expect(h).toContain("76.123.456-7");
    expect(h).toContain("<strong");
    expect(h).not.toContain("evil.example");
    expect(h).toContain("malo");
  });

  it("sin referencias no crea enlaces aunque el texto traiga markdown externo", () => {
    const h = html([
      {
        id: "1",
        rol: "agente",
        texto: "Mira [esto](https://evil.example/x) y [/ruta](/cuentas/x).",
      },
    ]);
    expect(h).not.toContain("href=");
    expect(h).toContain("esto");
  });
});

describe("fichas del agente cuando se piden tarjetas (CAR-523)", () => {
  it("con «tarjetas» dibuja fichas primero y quita la lista de viñetas", () => {
    const h = html([
      { id: "u", rol: "yo", texto: "Dame 2 cuentas en tarjetas" },
      {
        id: "a",
        rol: "agente",
        texto: `Aquí tienes:\n\n- [Acme SpA](${cuenta.href})\n- [Cotización 12](${cotiz.href})`,
        referencias: [cuenta, cotiz],
      },
    ]);
    expect(h).toContain("Abrir");
    expect(h).toContain("activa");
    expect(h).toContain("76.123.456-7");
    expect(h).toContain("Aquí tienes");
    expect(h).not.toContain("<ul");
    expect(h.indexOf("Abrir")).toBeLessThan(h.indexOf("Aquí tienes"));
  });
});
