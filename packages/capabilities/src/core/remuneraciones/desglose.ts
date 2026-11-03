import { clp, formatearCLP, UF_ESCALA } from "@opai/domain";

import { pctDisplay, resumenIndicador, ufCentavosDisplay, ufEscaladaDisplay } from "./formato";

function etiquetaAfp(id: string): string {
  const n: Record<string, string> = {
    uno: "Uno",
    modelo: "Modelo",
    planvital: "PlanVital",
    habitat: "Habitat",
    capital: "Capital",
    cuprum: "Cuprum",
    provida: "Provida",
  };
  return n[id] ?? id;
}

/** Líneas para el panel lateral (desglose completo). */
export function desgloseIndicador(clave: string, valor: unknown): string[] {
  if (valor == null) return ["Sin valor publicado."];
  switch (clave) {
    case "uf":
      return [`Valor del día: ${ufCentavosDisplay(Number(valor))}`];
    case "utm":
    case "imm":
      return [`Monto: ${formatearCLP(clp(Number(valor)))}`];
    case "sis":
      return [`Tasa SIS: ${pctDisplay(Number(valor))}`];
    case "jornada":
      return [`Tope semanal: ${Number(valor)} horas`];
    case "reforma": {
      const r = valor as { tasa: number; incluyeSis?: boolean };
      return [
        `Aporte empleador: ${pctDisplay(r.tasa)}`,
        r.incluyeSis ? "Incluye el SIS dentro del 3,5 %." : "No incluye SIS en el tope.",
      ];
    }
    case "mutual": {
      const m = valor as { basica: number; sanna: number };
      return [`Mutual básica: ${pctDisplay(m.basica)}`, `SANNA: ${pctDisplay(m.sanna)}`];
    }
    case "cesantia": {
      const c = valor as { indefinidoEmpleador: number; plazoFijoEmpleador: number; indefinidoTrabajador: number };
      return [
        `Empleador contrato indefinido: ${pctDisplay(c.indefinidoEmpleador)}`,
        `Empleador plazo fijo: ${pctDisplay(c.plazoFijoEmpleador)}`,
        `Trabajador indefinido: ${pctDisplay(c.indefinidoTrabajador)}`,
      ];
    }
    case "afp": {
      const a = valor as {
        obligatoria: number;
        salud: number;
        comisiones: Record<string, number>;
      };
      const com = Object.entries(a.comisiones ?? {})
        .sort(([x], [y]) => x.localeCompare(y))
        .map(([k, v]) => `${etiquetaAfp(k)}: ${pctDisplay(v)}`);
      return [
        `Cotización obligatoria: ${pctDisplay(a.obligatoria)}`,
        `Salud (7 %): ${pctDisplay(a.salud)}`,
        "Comisiones AFP:",
        ...com,
      ];
    }
    case "topes": {
      const t = valor as Record<string, unknown>;
      const lineas = [
        `Tope pensión y salud: ${ufEscaladaDisplay(Number(t.pensionSaludUf))}`,
        `Tope indemnización: ${ufEscaladaDisplay(Number(t.indemnizacionUf))}`,
        `Tope cesantía: ${ufEscaladaDisplay(Number(t.cesantiaUf))}`,
        `Tope IPS: ${ufEscaladaDisplay(Number(t.ipsUf))}`,
      ];
      if (t.ipsPorVerificar === true) lineas.push("Tope IPS marcado por verificar.");
      return lineas;
    }
    case "impuesto": {
      const tramos = valor as { hastaUtm: number | null; tasa: number; rebajaUtm: number }[];
      return tramos.map((tr, i) => {
        const hasta =
          tr.hastaUtm == null ? "y más" : `hasta ${(tr.hastaUtm / UF_ESCALA).toFixed(3).replace(".", ",")} UTM`;
        return `Tramo ${i + 1} (${hasta}): ${pctDisplay(tr.tasa)} · rebaja ${tr.rebajaUtm} UTM`;
      });
    }
    default:
      return [String(valor)];
  }
}

export function resumenHistorial(clave: string, valorJson: unknown, resumenFallback: string): string {
  if (valorJson == null) return resumenFallback;
  if (typeof valorJson === "number" || typeof valorJson === "object") {
    try {
      return resumenIndicador(clave, valorJson);
    } catch {
      return resumenFallback;
    }
  }
  return resumenFallback;
}
