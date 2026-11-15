// Configuración de acceso de una empresa o de una instalación (CAR-479, R1, R2, R25). Sin dependencias: la usa
// también el formulario de la portería, que se carga en el teléfono.
import { type DocumentoNormalizado, normalizarDocumento, type TipoDocumento } from "./documento";

export const TIPOS_REGISTRO = [
  "visita",
  "contratista",
  "proveedor",
  "vehiculo",
  "despacho",
] as const;
export type TipoRegistro = (typeof TIPOS_REGISTRO)[number];

/** Campos opcionales que trae el formulario; los personalizados usan ids `c_…`. Documento y nombre van siempre. */
export const CAMPOS_FIJOS = ["empresa", "motivo", "patente"] as const;
export const MAX_CAMPOS = 15;

export type CampoAcceso = { id: string; etiqueta: string; activo: boolean; obligatorio: boolean };

export type ConfigAcceso = {
  /** Tipos de ingreso habilitados, en el orden en que se ofrecen. */
  tipos: TipoRegistro[];
  /** Campos del formulario, en el orden en que se muestran. */
  campos: CampoAcceso[];
  /** Exigir que el RUN tenga el dígito verificador correcto (R5). */
  validarRut: boolean;
  /** «Permitir ingresos fuera de lista» (R2): apagado, quien no está autorizado no entra si hay lista. */
  permitirFueraDeLista: boolean;
  /** Minutos tras los que alguien en sitio aparece destacado (R25); `null`, sin límite. */
  permanenciaMaxMin: number | null;
  /** Hora local (0–23) en que se cierran solos los registros abiertos (R25); `null`, sin cierre automático. */
  cierreHora: number | null;
};

export const CONFIG_ACCESO_DEFECTO: ConfigAcceso = {
  tipos: [...TIPOS_REGISTRO],
  campos: [
    { id: "empresa", etiqueta: "Empresa", activo: true, obligatorio: false },
    { id: "motivo", etiqueta: "Motivo", activo: true, obligatorio: false },
    { id: "patente", etiqueta: "Patente", activo: false, obligatorio: false },
  ],
  validarRut: true,
  permitirFueraDeLista: false,
  permanenciaMaxMin: null,
  cierreHora: null,
};

export const esCampoPersonalizado = (id: string) => id.startsWith("c_");

/** La de la instalación reemplaza entera a la de la empresa; sin ninguna, la de fábrica. */
export const configEfectiva = (
  empresa: ConfigAcceso | null,
  instalacion: ConfigAcceso | null,
): ConfigAcceso => instalacion ?? empresa ?? CONFIG_ACCESO_DEFECTO;

/** Campos que pide el formulario para un tipo: los activos y, en un vehículo, siempre la patente. */
export const camposDelTipo = (c: ConfigAcceso, tipo: string): CampoAcceso[] =>
  c.campos.filter((f) => f.activo || (tipo === "vehiculo" && f.id === "patente"));

/** Etiqueta del primer campo obligatorio sin valor, o `null` si están todos. */
export function faltaObligatorio(
  c: ConfigAcceso,
  tipo: string,
  valores: Readonly<Record<string, string>>,
): string | null {
  const falta = camposDelTipo(c, tipo).find((f) => f.obligatorio && !(valores[f.id] ?? "").trim());
  return falta?.etiqueta ?? null;
}

/** ¿Lleva en sitio más que la permanencia máxima (`null`, sin límite)? */
export const excedePermanencia = (maxMin: number | null, entradaEn: string, ahora: Date) =>
  maxMin !== null && ahora.getTime() - new Date(entradaEn).getTime() > maxMin * 60_000;

/**
 * Documento según «validar RUT»: apagado, un RUN con dígito verificador equivocado se guarda como otro documento
 * chileno, que nunca se confunde con un RUN validado ni con sus listas.
 */
export function documentoSegun(
  validarRut: boolean,
  d: { tipo: TipoDocumento; numero: string; pais?: string },
): DocumentoNormalizado | null {
  const doc = normalizarDocumento(d);
  if (doc || d.tipo !== "run" || validarRut) return doc;
  return normalizarDocumento({ tipo: "otro", numero: d.numero.replace(/\./g, ""), pais: "CL" });
}
