import type {
  EntidadCampoPersonalizado,
  FormatoNumeroCampo,
  OpcionCampo,
  TipoCampoPersonalizado,
  ValorCampoPersonalizado,
} from "@opai/domain";

export type CampoConfig = {
  id: string;
  entidad: EntidadCampoPersonalizado;
  clave: string;
  etiqueta: string;
  descripcion: string | null;
  tipo: TipoCampoPersonalizado;
  formato: FormatoNumeroCampo | null;
  opciones: OpcionCampo[];
  valorDefecto: ValorCampoPersonalizado;
  obligatorio: boolean;
  orden: number;
  activo: boolean;
};
export type FichaConfig = { valor: EntidadCampoPersonalizado; nombre: string };

export const TIPOS: { valor: TipoCampoPersonalizado; etiqueta: string }[] = [
  { valor: "texto", etiqueta: "Texto de una línea" },
  { valor: "texto_largo", etiqueta: "Texto de varias líneas" },
  { valor: "numero", etiqueta: "Número" },
  { valor: "fecha", etiqueta: "Fecha" },
  { valor: "fecha_hora", etiqueta: "Fecha y hora" },
  { valor: "si_no", etiqueta: "Sí o no" },
  { valor: "lista", etiqueta: "Desplegable (una opción)" },
  { valor: "radio", etiqueta: "Botones de opción (una opción)" },
  { valor: "multiple", etiqueta: "Casillas (varias opciones)" },
  { valor: "email", etiqueta: "Correo" },
  { valor: "telefono", etiqueta: "Teléfono" },
  { valor: "url", etiqueta: "Dirección web" },
  { valor: "rut", etiqueta: "RUT" },
  { valor: "usuario", etiqueta: "Usuario de la empresa" },
];
export const FORMATOS: { valor: FormatoNumeroCampo; etiqueta: string }[] = [
  { valor: "decimal", etiqueta: "Decimal" },
  { valor: "entero", etiqueta: "Entero" },
  { valor: "moneda_clp", etiqueta: "Moneda (CLP)" },
  { valor: "porcentaje", etiqueta: "Porcentaje" },
];

/** «Desplegable · Minería, Retail» o «Número · Moneda (CLP)», para la lista de campos. */
export function resumenTipo(c: CampoConfig): string {
  const tipo = TIPOS.find((t) => t.valor === c.tipo)?.etiqueta ?? c.tipo;
  if (c.opciones.length > 0) return `${tipo} · ${c.opciones.map((o) => o.etiqueta).join(", ")}`;
  const formato = FORMATOS.find((f) => f.valor === c.formato)?.etiqueta;
  return formato ? `${tipo} · ${formato}` : tipo;
}
