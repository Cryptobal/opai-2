import { describe, expect, it } from "vitest";

import {
  accionPrimariaCpq,
  bloqueoEnvioCpq,
  bloqueoMutualCpq,
  hayBarraFijaCpq,
  pedirAprobacionDeshabilitada,
} from "@/app/(erp)/cotizaciones/[id]/_componentes/acciones-cotizacion-logica";
import { RUTA_REMUNERACIONES } from "@/lib/cpq-avisos";

const LINEA = "00000000-0000-7000-8000-000000000001";

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
    expect(bloqueoEnvioCpq(p)?.recalcular).toBe(true);
    expect(accionPrimariaCpq(p)).toBeNull();
    expect(pedirAprobacionDeshabilitada(p)).toBe(true);
    expect(hayBarraFijaCpq(p)).toBe(true);
  });

  it("sueldo faltante: la causa nombra el puesto y su acción abre la hoja, sin «Ver cargos»", () => {
    const p = {
      version: { estado: "borrador" },
      calculo: {
        noEnviable: true,
        advertencias: ["costo laboral pendiente: motor de sueldos"],
        avisos: [
          {
            codigo: "sueldo_faltante",
            mensaje: "Falta el sueldo base de «Guardia día».",
            lineaId: LINEA,
          },
        ],
      },
      gestionar: true,
    };
    const b = bloqueoEnvioCpq(p);
    expect(b?.titulo).toContain("Guardia día");
    expect(b?.accion).toEqual({
      tipo: "editar_linea",
      lineaId: LINEA,
      etiqueta: "Ingresar sueldo",
    });
    expect(b?.enlace).toBeUndefined();
    expect(JSON.stringify(b)).not.toContain("Ver cargos");
  });

  it("juego legal faltante enlaza a la página real de Remuneraciones", () => {
    const b = bloqueoEnvioCpq({
      version: { estado: "borrador" },
      calculo: {
        noEnviable: true,
        avisos: [{ codigo: "juego_legal_faltante", mensaje: "x", indicador: "afp" }],
      },
      gestionar: true,
    });
    expect(b?.titulo).toContain("afp");
    expect(b?.enlace?.href).toBe(RUTA_REMUNERACIONES);
  });

  it("mutual sin confirmar no bloquea el cálculo pero sí el envío", () => {
    const p = {
      version: { estado: "borrador" },
      calculo: { noEnviable: false, avisos: [{ codigo: "mutual_sin_confirmar", mensaje: "m" }] },
      meta: { requiereConfirmarMutual: true, puedeEnviar: false },
      gestionar: true,
    };
    expect(bloqueoEnvioCpq(p)).toBeNull();
    expect(bloqueoMutualCpq(p)?.enlace?.href).toBe(`${RUTA_REMUNERACIONES}?mutual=1`);
    expect(accionPrimariaCpq(p)).toMatchObject({ id: "lista" });
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
