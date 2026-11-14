import { normalizarRut } from "../rut";
import type { AdministradoraAFP } from "../remuneraciones/indicadores";
import type { LineaLiquidacion } from "./liquidacion";

/**
 * Nómina de Previred, formato estándar de largo variable por separador (105 campos, «;», una línea por
 * persona, sin encabezado): especificación oficial «FormatoLargoVariablePorSeparador» v58 (abril 2022),
 * consultada en previred.com el 14-nov-2026. Verificado: orden y tipo de los 105 campos, período
 * `mmaaaa`, fechas `dd/mm/aaaa`, RUT en cuerpo y DV, ceros en numéricos y blanco en texto que no aplican.
 * POR VERIFICAR: códigos de AFP, Fonasa y movimientos de personal, el reparto Fonasa/CCAF y los campos
 * que cambió la reforma previsional de 2025–2026 (SIS, rentabilidad protegida). OPAI no envía nada (R11).
 */
export const CAMPOS_PREVIRED = 105;

/** Códigos de AFP en Previred (por verificar con la tabla vigente). */
export const CODIGO_AFP_PREVIRED: Record<AdministradoraAFP, number> = {
  capital: 33, cuprum: 3, habitat: 5, modelo: 34, planvital: 29, provida: 8, uno: 35,
};
const FONASA = 7;

export type DatosPrevired = {
  personaId: string;
  rut: string;
  apellidos: string;
  nombres: string;
  sexo: string | null;
  extranjero: boolean;
  pensionado: boolean;
  diasTrabajados: number;
  /** aaaa-mm-dd si el contrato empieza o termina dentro del mes. */
  ingresoEnMes: string | null;
  retiroEnMes: string | null;
  tramoAsignacion: string | null;
  cargas: { simples: number; maternales: number; invalidez: number };
  prevision: { afp: AdministradoraAFP; salud: "fonasa" | "isapre"; basePrevisional: number; baseCesantia: number } | null;
  descuentosLegales: LineaLiquidacion[];
  aportesEmpleador: LineaLiquidacion[] | null;
};

export type ErrorPrevired = { personaId: string | null; mensaje: string };
export type ArchivoPrevired = { nombre: string; contenido: string; filas: number; errores: ErrorPrevired[]; advertencias: string[] };

const monto = (l: LineaLiquidacion[] | null, concepto: string) => (l ?? []).find((x) => x.concepto === concepto)?.monto ?? 0;
const fecha = (iso: string) => { const [a, m, d] = iso.split("-"); return `${d}/${m}/${a}`; };
/** Texto en ASCII (sin tildes; Ñ→N) y sin «;» ni saltos de línea: Previred no acepta otros caracteres (por verificar). */
const texto = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").replace(/[;\s]+/g, " ").replace(/[^\x20-\x7E]/g, "").trim().slice(0, 30);
const TRAMOS = new Set(["A", "B", "C", "D"]);
/** Primer apellido y el resto (el maestro guarda los apellidos juntos): por verificar con la persona. */
const apellidosDe = (s: string) => { const [p = "", ...r] = s.trim().split(/\s+/); return [p, r.join(" ")] as const; };

/** Los 105 campos de una persona (índice 0 = campo 1). */
export function lineaPrevired(d: DatosPrevired, anio: number, mes: number): { campos: (string | number)[]; errores: ErrorPrevired[] } {
  const errores: ErrorPrevired[] = [];
  const c: (string | number)[] = Array.from({ length: CAMPOS_PREVIRED }, () => 0);
  // Campos de texto que no aplican van en blanco.
  for (const i of [4, 16, 17, 25, 35, 36, 37, 41, 46, 51, 52, 53, 54, 56, 57, 76, 95, 104, 105]) c[i - 1] = "";
  const set = (n: number, v: string | number) => { c[n - 1] = v; };
  const rut = normalizarRut(d.rut);
  if (!rut) errores.push({ personaId: d.personaId, mensaje: "RUT inválido." });
  const [cuerpo = "", dv = ""] = (rut ?? "").split("-");
  const [paterno, materno] = apellidosDe(d.apellidos.replace(/;/g, " "));
  set(1, cuerpo); set(2, dv); set(3, texto(paterno)); set(4, texto(materno)); set(5, texto(d.nombres));
  const sexo = d.sexo === "femenino" ? "F" : d.sexo === "masculino" ? "M" : "";
  if (!sexo) errores.push({ personaId: d.personaId, mensaje: "Falta el sexo (F o M) que pide Previred." });
  set(6, sexo); set(7, d.extranjero ? 1 : 0); set(8, 1);
  set(9, `${String(mes).padStart(2, "0")}${anio}`);
  set(11, "AFP"); set(12, d.pensionado ? 1 : 0); set(13, d.diasTrabajados); set(14, "00");
  if (d.ingresoEnMes) { set(15, 1); set(16, fecha(d.ingresoEnMes)); }
  if (d.retiroEnMes) { set(15, 2); set(17, fecha(d.retiroEnMes)); }
  const tramo = (d.tramoAsignacion ?? "D").trim().toUpperCase();
  if (!TRAMOS.has(tramo)) errores.push({ personaId: d.personaId, mensaje: "Tramo de asignación familiar fuera de A–D: se informa D." });
  set(18, TRAMOS.has(tramo) ? tramo : "D");
  set(19, d.cargas.simples); set(20, d.cargas.maternales); set(21, d.cargas.invalidez); set(25, "N");
  const p = d.prevision;
  if (!p) errores.push({ personaId: d.personaId, mensaje: "Liquidación sin datos de previsión: recalcula el período." });
  if (!d.aportesEmpleador) errores.push({ personaId: d.personaId, mensaje: "Liquidación sin aportes del empleador: recalcula el período." });
  if (p) {
    set(26, CODIGO_AFP_PREVIRED[p.afp]); set(27, p.basePrevisional);
    set(28, monto(d.descuentosLegales, "AFP")); set(29, monto(d.aportesEmpleador, "SIS"));
    const salud = monto(d.descuentosLegales, "Salud");
    if (p.salud === "fonasa") { set(70, salud); set(75, FONASA); }
    else {
      const obligatoria = Math.min(salud, Math.round((p.basePrevisional * 7) / 100));
      set(77, p.basePrevisional); set(79, salud); set(80, obligatoria); set(81, salud - obligatoria);
    }
    set(97, p.basePrevisional); set(98, monto(d.aportesEmpleador, "Ley 16.744 y SANNA"));
    set(100, p.baseCesantia); set(101, monto(d.descuentosLegales, "Seguro de cesantía"));
    set(102, monto(d.aportesEmpleador, "Seguro de cesantía empleador"));
  }
  return { campos: c, errores };
}

/** Archivo completo: una línea principal (tipo 00) por persona, sin encabezado. */
export function archivoPrevired(e: { rutEmpleador: string; anio: number; mes: number; filas: DatosPrevired[] }): ArchivoPrevired {
  const errores: ErrorPrevired[] = [];
  const rutEmp = normalizarRut(e.rutEmpleador);
  if (!rutEmp) errores.push({ personaId: null, mensaje: "Falta un RUT válido de la empresa (Configuración → Remuneraciones o datos de la empresa)." });
  const lineas = e.filas.map((d) => {
    const l = lineaPrevired(d, e.anio, e.mes);
    errores.push(...l.errores);
    return l.campos.join(";");
  });
  const isapres = e.filas.some((d) => d.prevision?.salud === "isapre");
  const advertencias = [
    "Formato por verificar: códigos de AFP, Fonasa y movimientos de personal, y los campos de la reforma previsional, antes de cargarlo en Previred.",
    "Mutual (campo 96) y CCAF van sin código: complétalos o revisa en Previred antes de pagar.",
    ...(isapres ? ["Isapre sin código de institución (campo 75): falta mapear el nombre de cada isapre a su código Previred."] : []),
  ];
  const cuerpoRut = (rutEmp ?? "").split("-")[0] ?? "";
  const nombre = `previred_${cuerpoRut || "rut"}_${String(e.mes).padStart(2, "0")}${e.anio}.txt`;
  return { nombre, contenido: lineas.join("\r\n") + (lineas.length ? "\r\n" : ""), filas: lineas.length, errores, advertencias };
}
