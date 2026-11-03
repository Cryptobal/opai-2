import { describe, expect, it } from "vitest";

import {
  accionPrimariaCpq,
  bloqueoEnvioCpq,
  hayBarraFijaCpq,
  pedirAprobacionDeshabilitada,
} from "@/app/(erp)/cotizaciones/[id]/_componentes/acciones-cotizacion-logica";

describe("acciones-cotizacion-logica", () => {
  it("no ofrece pedir aprobación cuando noEnviable", () => {
    const p = {
      version: { estado: "borrador" },
      calculo: {
        requiereAprobacion: true,
        noEnviable: true,
        advertencias: ["costo laboral pendiente: motor de sueldos"],
      },
      gestionar: true,
    };
    expect(bloqueoEnvioCpq(p)?.laboralPendiente).toBe(true);
    expect(accionPrimariaCpq(p)).toBeNull();
    expect(pedirAprobacionDeshabilitada(p)).toBe(true);
    expect(hayBarraFijaCpq(p)).toBe(true);
  });

  it("sueldo base bloqueado pide editar el puesto, sin enlace a cargos", () => {
    const p = {
      version: { estado: "borrador" },
      calculo: {
        requiereAprobacion: true,
        noEnviable: true,
        advertencias: ["costo pendiente: falta sueldo base"],
      },
      gestionar: true,
    };
    const b = bloqueoEnvioCpq(p);
    expect(b?.laboralPendiente).toBe(false);
    expect(b?.enlace).toBeUndefined();
    expect(b?.mensaje).toMatch(/hoja de edición del puesto/i);
  });

  it("pedir aprobación solo cuando el cálculo lo permite", () => {
    const ok = {
      version: { estado: "borrador" },
      calculo: { requiereAprobacion: true, noEnviable: false },
      gestionar: true,
    };
    expect(accionPrimariaCpq(ok)).toMatchObject({ id: "pedir", etiqueta: "Pedir aprobación" });
    expect(bloqueoEnvioCpq(ok)).toBeNull();
  });
});
