import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: (props: Record<string, unknown>) =>
    createElement("a", { href: props["href"] as string }, props["children"] as never),
}));
vi.mock("@/app/_components/ejecutar-capacidad", () => ({
  ejecutarCapacidad: vi.fn(async () => ({ ok: true })),
}));

import { VistaEntidad } from "@/app/_components/documentos/generar-entidad/vista-entidad";
import { VistaGenerar } from "@/app/_components/documentos/generar-entidad/vista-generar";

const parrafos = [
  [
    { texto: "Hola ", negrita: false, cursiva: false, faltante: null },
    { texto: "{{falta}}", negrita: false, cursiva: false, faltante: "x" },
  ],
];

const plantilla = { id: "pl1", nombre: "Contrato", clase: "contrato_trabajo", version: 2 };
const faltantes = [{ clave: "x", etiqueta: "RUT", motivo: "No está en la ficha" }];

describe("vista previa al generar documento (CAR-439)", () => {
  it("persona: enlace a la ficha, firma y mensaje de envío a firma", () => {
    const html = renderToStaticMarkup(
      createElement(VistaGenerar, {
        fichaHref: "/personas/p1",
        documentosHref: "/personas/p1/documentos",
        vista: {
          plantilla,
          persona: { id: "p1", nombre: "Ana Rojas" },
          parrafos,
          faltantes: [],
          puedeGenerar: true,
          firma: { nivel: "avanzada", firmantes: "ambos" },
        },
      }),
    );
    expect(html).toContain("Ana Rojas");
    expect(html).toContain("trabajador y empleador");
    expect(html).toContain("el envío a firma llega en el siguiente paso");
    expect(html).toContain("Generar PDF");
  });

  it("persona: con faltantes enlaza a la ficha de la persona", () => {
    const html = renderToStaticMarkup(
      createElement(VistaGenerar, {
        fichaHref: "/personas/p1",
        documentosHref: "/personas/p1/documentos",
        vista: {
          plantilla,
          persona: { id: "p1", nombre: "Ana Rojas" },
          parrafos,
          faltantes,
          puedeGenerar: false,
          firma: { nivel: "simple", firmantes: "trabajador" },
        },
      }),
    );
    expect(html).toContain("Abrir la ficha de la persona");
    expect(html).toContain('href="/personas/p1"');
    expect(html).toContain("Falta un dato: RUT");
    expect(html).toContain("{{falta}}");
  });

  it("cuenta: sin bloque de firma y con etiqueta de cuenta", () => {
    const html = renderToStaticMarkup(
      createElement(VistaEntidad, {
        fichaHref: "/cuentas/c1",
        documentosHref: "/cuentas/c1/documentos",
        vista: {
          plantilla: { ...plantilla, clase: "contrato_servicio" },
          entidad: { tipo: "cuenta", id: "c1", nombre: "Andina" },
          parrafos,
          faltantes: [],
          puedeGenerar: true,
          firma: { nivel: "simple", firmantes: "empleador" },
        },
      }),
    );
    expect(html).toContain("Andina");
    expect(html).toContain(">Cuenta<");
    expect(html).not.toContain("Firma");
    expect(html).toContain("Todos los datos están en la ficha. Puedes generar el PDF.");
    expect(html).not.toContain("envío a firma");
  });

  it("instalación: con faltantes enlaza a Abrir la ficha", () => {
    const html = renderToStaticMarkup(
      createElement(VistaEntidad, {
        fichaHref: "/instalaciones/i1",
        documentosHref: "/instalaciones/i1/documentos",
        vista: {
          plantilla: { ...plantilla, clase: "acta" },
          entidad: { tipo: "instalacion", id: "i1", nombre: "Bodega" },
          parrafos,
          faltantes,
          puedeGenerar: false,
          firma: { nivel: "simple", firmantes: "empleador" },
        },
      }),
    );
    expect(html).toContain("Abrir la ficha");
    expect(html).not.toContain("Abrir la ficha de la persona");
    expect(html).toContain(">Instalación<");
    expect(html).toContain('href="/instalaciones/i1"');
  });
});
