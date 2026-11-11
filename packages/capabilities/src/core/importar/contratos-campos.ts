// Importador de contratos (CAR-282, PR 2): qué columnas acepta la planilla. Una fila es un vínculo laboral
// (persona + cargo + instalación + tipo + fechas); la persona ya debe existir (se carga antes con «Personas»).
import type { DefinicionImportador, FilaNormalizada } from "@opai/domain/importacion";

import { CAMPOS_CUENTA, CAMPO_ID_EXTERNO, entero, fecha, texto } from "./comun";

export type DatosContrato = {
  personaId: string;
  cargoId: string;
  instalacionId: string;
  tipo: string;
  inicio: Date;
  termino: Date | null;
  horasSemanales: number;
  distribucion: string;
};

export const TIPOS = {
  indefinido: ["indefinido", "indef", "permanente"],
  plazo_fijo: ["plazo fijo", "plazo_fijo", "fijo", "temporal"],
  por_obra: ["por obra", "obra", "faena", "por faena"],
  honorarios: ["honorarios", "boleta"],
} as const;

export const defContratos: DefinicionImportador = {
  id: "contratos",
  etiqueta: "Contratos vigentes",
  descripcion:
    "Contrato de cada persona: cargo, instalación, tipo y fechas. La persona se reconoce por RUT y debe existir antes (importa primero «Personas»). Una fila por contrato; reimportar no lo duplica.",
  campos: [
    CAMPO_ID_EXTERNO,
    { clave: "persona_rut", etiqueta: "RUT de la persona", tipo: "rut", requerido: true, sinonimos: ["rut", "rut trabajador", "rut guardia", "run"], ejemplo: "11.111.111-1" },
    { clave: "cargo", etiqueta: "Cargo", tipo: "texto", requerido: true, sinonimos: ["cargo nombre", "puesto de trabajo", "roleTitle", "position"], ejemplo: "Guardia de seguridad", largoMaximo: 120, ayuda: "Nombre de un cargo que ya exista en Maestros." },
    { clave: "instalacion", etiqueta: "Instalación", tipo: "texto", requerido: true, sinonimos: ["instalación", "sucursal", "lugar", "installation"], ejemplo: "Bodega Quilicura", largoMaximo: 200 },
    ...CAMPOS_CUENTA.filter((c) => c.clave !== "cuenta_id_externo").map((c) => ({ ...c, ayuda: "Solo si dos cuentas tienen una instalación con el mismo nombre." })),
    {
      clave: "tipo", etiqueta: "Tipo de contrato", tipo: "opcion", requerido: true, sinonimos: ["tipo contrato", "contractType", "contrato"], ejemplo: "indefinido",
      opciones: { ...TIPOS },
    },
    { clave: "inicio", etiqueta: "Inicio", tipo: "fecha", requerido: true, sinonimos: ["fecha inicio", "fecha de ingreso", "ingreso", "hiredAt", "startDate"], ejemplo: "01-03-2024" },
    { clave: "termino", etiqueta: "Término", tipo: "fecha", sinonimos: ["fecha termino", "fecha término", "terminatedAt", "endDate"], ejemplo: "", ayuda: "Vacío en un contrato indefinido o aún en curso." },
    { clave: "horas_semanales", etiqueta: "Horas semanales", tipo: "entero", requerido: true, sinonimos: ["horas", "jornada", "weeklyHours"], ejemplo: "44" },
    { clave: "distribucion", etiqueta: "Distribución de la jornada", tipo: "texto", requerido: true, sinonimos: ["distribución", "turno", "jornada pactada"], ejemplo: "4x4 de 12 horas", largoMaximo: 200 },
  ],
};

export type Leidos = Omit<DatosContrato, "personaId" | "cargoId" | "instalacionId" | "tipo"> & {
  rut: string; cargo: string; instalacion: string; tipo: string | null; cuentaRut: string | null; cuentaNombre: string | null;
};

export function leerContrato(f: FilaNormalizada): Leidos {
  const d = (k: string) => texto(f.datos[k]);
  return {
    rut: d("persona_rut") ?? "", cargo: d("cargo") ?? "", instalacion: d("instalacion") ?? "", tipo: d("tipo"),
    cuentaRut: d("cuenta_rut"), cuentaNombre: d("cuenta_nombre"),
    inicio: fecha(f.datos["inicio"]) ?? new Date(NaN), termino: fecha(f.datos["termino"]),
    horasSemanales: entero(f.datos["horas_semanales"]) ?? 0, distribucion: d("distribucion") ?? "",
  };
}

/** Errores propios de la fila (los de la persona, el cargo y la instalación se suman al armar el plan). */
export function erroresDeContrato(l: Leidos): string[] {
  const e: string[] = [];
  if (!l.tipo) e.push("Falta el tipo de contrato: indefinido, plazo fijo, por obra u honorarios.");
  if (l.termino && l.termino < l.inicio) e.push("El término es anterior al inicio.");
  if (l.horasSemanales < 1 || l.horasSemanales > 168) e.push("Las horas semanales van entre 1 y 168.");
  return e;
}
