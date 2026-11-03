import { describe, expect, it } from "vitest";

import { avisosResumenCpq } from "@/lib/cpq-avisos-compactos";
import { avisoLineaPuesto, avisosCpq, RUTA_REMUNERACIONES } from "@/lib/cpq-avisos";
import {
  conteo,
  etiquetaCategoria,
  subtituloLineaCpq,
  ventaMensualTexto,
} from "@/lib/cpq-presentacion";
import { textoAprobacionMargenN6 } from "@/lib/cpq-aprobacion-presentacion";

describe("cpq-presentacion", () => {
  it("traduce categorías internas", () => {
    expect(etiquetaCategoria("mano_obra")).toBe("Mano de obra");
    expect(etiquetaCategoria("movilizacion")).toBe("Movilización");
  });

  it("venta sin cálculo muestra «—», no cero", () => {
    expect(ventaMensualTexto(0, true)).toBe("—");
    expect(ventaMensualTexto(null, false)).toBe("—");
    expect(ventaMensualTexto(1_000_000, false)).toBe(1_000_000);
  });

  it("avisos por código: la causa concreta, sin duplicar el texto genérico", () => {
    const a = avisosCpq({
      advertencias: [
        "costo laboral pendiente: motor de sueldos",
        "Mutual adicional sin confirmar: se calcula con 0 %.",
      ],
      avisos: [
        { codigo: "mutual_sin_confirmar", mensaje: "m" },
        { codigo: "sueldo_faltante", mensaje: "Falta el sueldo base de «Guardia».", lineaId: "l1" },
      ],
    });
    expect(a.map((x) => x.id)).toEqual(["mutual", "sueldo-l1"]);
    expect(a[0]?.bloquea).toBe(false);
    expect(a[1]?.accion?.lineaId).toBe("l1");
  });

  it("ningún enlace de CPQ apunta a rutas que no existen", () => {
    const viejos = avisosCpq({
      advertencias: [
        "costo laboral pendiente: motor de sueldos",
        "falta valor UF",
        "costo pendiente: falta afp",
      ],
    });
    const hrefs = viejos.flatMap((x) => (x.enlace ? [x.enlace.href] : []));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const h of hrefs) expect(h.startsWith(RUTA_REMUNERACIONES)).toBe(true);
    expect(JSON.stringify(viejos)).not.toMatch(/configuracion\/grupo|personas\/cargos/);
  });

  it("aviso por línea abre la hoja del puesto", () => {
    const a = avisoLineaPuesto("costo pendiente: falta sueldo base", {
      id: "l9",
      nombre: "Guardia noche",
    });
    expect(a?.titulo).toContain("Guardia noche");
    expect(a?.accion).toMatchObject({ tipo: "editar_linea", lineaId: "l9" });
    expect(a?.enlace).toBeUndefined();
  });

  it("resumen: un «Costo pendiente» sin botón si falta sueldo", () => {
    const r = avisosResumenCpq({
      avisos: [
        { codigo: "sueldo_faltante", mensaje: "Falta el sueldo base de «Guardia».", lineaId: "l1" },
        { codigo: "mutual_sin_confirmar", mensaje: "m" },
      ],
    });
    expect(r.filter((x) => x.titulo.includes("Falta el sueldo"))).toHaveLength(0);
    expect(r.find((x) => x.titulo === "Costo pendiente")?.accion).toBeUndefined();
    expect(r.some((x) => x.id === "mutual")).toBe(true);
  });

  it("plurales", () => {
    expect(conteo(1, "persona")).toBe("1 persona");
    expect(conteo(2, "persona")).toBe("2 personas");
  });

  it("subtítulo de línea puesto sin repetir tipo genérico", () => {
    expect(
      subtituloLineaCpq({
        tipo: "puesto",
        posiciones: 2,
        patron: "4×4",
        horaInicio: "08:00",
        horaFin: "20:00",
      }),
    ).toBe("4×4 · 2 guardias");
    expect(subtituloLineaCpq({ tipo: "mano_obra" })).toBe("Mano de obra");
  });

  it("texto N6 de aprobación de margen", () => {
    expect(
      textoAprobacionMargenN6({
        autoaprobacionMargen: true,
        puedeAprobarMargen: true,
        motivoNoAprobarMargen: null,
      }).detalle,
    ).toContain("autoaprobación");
  });
});
