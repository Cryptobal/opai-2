import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { textoError } from "@/app/_components/agente/mensajes-error";
import { TarjetaPlan } from "@/app/_components/agente/tarjeta-plan";
import type { PlanVista } from "@/app/_components/agente/tipos";
import { VistaPrevia } from "@/app/_components/agente/vista-previa";

const paso = (n: number) => ({
  capacidad: "core.instalaciones.update",
  argumentos: {},
  clave: `00000000-0000-4000-8000-00000000000${n}`,
  vistaPrevia: { data: { nombre: `Torre ${n}`, activo: true, anidado: { x: 1 } } },
});
const plan = (cambio: Partial<PlanVista> = {}): PlanVista => ({
  pasos: [paso(1), paso(2)],
  nivel: "paso_a_paso",
  token: "t",
  siguiente: 0,
  resultados: [],
  estado: "propuesto",
  vence: Date.now() + 30 * 60_000,
  ...cambio,
});
const html = (p: PlanVista) =>
  renderToStaticMarkup(createElement(TarjetaPlan, { plan: p, onDecidir: () => undefined }));

describe("TarjetaPlan", () => {
  it("paso a paso: confirma solo el paso en curso y deja el siguiente atenuado", () => {
    const h = html(plan());
    expect(h).toContain("Plan · 2 cambios");
    expect(h).toContain("Confirmar este paso");
    expect(h).toContain("Descartar plan");
    expect(h).toContain("Por confirmar");
    expect(h).toContain("Pendiente");
    expect(h).not.toContain("core.instalaciones");
  });
  it("aprobar todo ofrece confirmar el plan completo", () => {
    expect(html(plan({ nivel: "aprobar_todo" }))).toContain("Confirmar plan");
  });
  it("tras un paso hecho muestra Hecho y avanza al siguiente", () => {
    const h = html(plan({ siguiente: 1, estado: "en_curso", resultados: [{ paso: 0, ok: true }] }));
    expect(h).toContain("Hecho");
    expect(h).toContain("Por confirmar");
  });
  it("un paso irreversible queda en aprobación y el plan no sigue solo", () => {
    const h = html(
      plan({
        estado: "aprobacion",
        resultados: [{ paso: 0, ok: false, code: "APPROVAL_REQUIRED" }],
      }),
    );
    expect(h).toContain("En aprobación");
    expect(h).toContain("pídelo de nuevo");
    expect(h).not.toContain("Confirmar");
  });
  it("un fallo detiene los pasos siguientes", () => {
    const h = html(
      plan({ estado: "fallido", resultados: [{ paso: 0, ok: false, code: "CONFLICT" }] }),
    );
    expect(h).toContain("Falló");
    expect(h).toContain("No se ejecutó");
  });
});

describe("VistaPrevia y errores", () => {
  it("muestra solo valores simples como texto (sin HTML ni anidados)", () => {
    const h = renderToStaticMarkup(
      createElement(VistaPrevia, { datos: { nombre: "<b>x</b>", anidado: { a: 1 } } }),
    );
    expect(h).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(h).not.toContain("Anidado");
  });
  it("los errores se explican en lenguaje de usuario y aclaran que no se cambió nada", () => {
    expect(textoError("RATE_LIMITED", "x")).toContain("Espera un minuto");
    expect(textoError("INTERNAL", "Falló.")).toContain("No se hizo ningún cambio");
  });
});
