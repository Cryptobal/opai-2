import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HiloAgente } from "@/app/_components/agente/hilo-agente";
import type { Mensaje, ReferenciaEntidad } from "@/app/_components/agente/tipos";

const cuenta: ReferenciaEntidad = {
  id: "11111111-1111-1111-1111-111111111111",
  titulo: "Acme SpA",
  detalle: "Cliente activo",
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
    expect(h).toContain("Cliente activo");
    expect(h).toContain("<strong");
    expect(h).toContain("<ul");
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
