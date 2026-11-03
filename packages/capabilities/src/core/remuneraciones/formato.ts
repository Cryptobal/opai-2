import { clp, formatearCLP, PCT_ESCALA, UF_ESCALA } from "@opai/domain";

const ZONA = "America/Santiago";

/** Hoy civil en zona Chile (evita el adelanto de UTC desde las 21:00 CLT). */
export function hoyCivil(zona = ZONA): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(new Date());
}

/** `aaaa-mm-dd` → `dd-mm-aaaa`. */
export function fechaDisplay(iso: string | null | undefined): string {
  if (!iso || iso === "—") return iso ?? "—";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [a, m, d] = iso.split("-");
  return `${d}-${m}-${a}`;
}

export function pctDisplay(escalada: number): string {
  const pct = (escalada * 100) / PCT_ESCALA;
  return `${pct.toFixed(2).replace(".", ",")} %`;
}

export function ufEscaladaDisplay(escalada: number): string {
  const uf = escalada / UF_ESCALA;
  return `${uf.toFixed(2).replace(".", ",")} UF`;
}

export function ufCentavosDisplay(centavos: number): string {
  const pesos = centavos / 100;
  return `$ ${pesos.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Resumen de una fila de la tabla (una línea). */
export function resumenIndicador(clave: string, valor: unknown): string {
  if (valor == null) return "Sin publicación";
  switch (clave) {
    case "uf":
      return ufCentavosDisplay(Number(valor));
    case "utm":
    case "imm":
      return formatearCLP(clp(Number(valor)));
    case "sis":
      return pctDisplay(Number(valor));
    case "jornada":
      return `${Number(valor)} h`;
    case "reforma": {
      const r = valor as { tasa: number; incluyeSis?: boolean };
      return `${pctDisplay(r.tasa)}${r.incluyeSis ? " (incl. SIS)" : ""}`;
    }
    case "mutual": {
      const m = valor as { basica: number; sanna: number };
      return `Básica ${pctDisplay(m.basica)} · SANNA ${pctDisplay(m.sanna)}`;
    }
    case "cesantia": {
      const c = valor as { indefinidoEmpleador: number; plazoFijoEmpleador: number; indefinidoTrabajador: number };
      return `Indef. ${pctDisplay(c.indefinidoEmpleador)} · Plazo fijo ${pctDisplay(c.plazoFijoEmpleador)}`;
    }
    case "afp": {
      const a = valor as { obligatoria: number; salud: number };
      return `Obligatoria ${pctDisplay(a.obligatoria)} · Salud ${pctDisplay(a.salud)}`;
    }
    case "topes":
    case "impuesto":
      return "Ver detalle";
    default:
      return typeof valor === "number" ? String(valor) : "Ver detalle";
  }
}
