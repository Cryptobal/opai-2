// Tipos sugeridos por vertical (CAR-235, R6): lo típico del rubro para empezar con un clic. La ropa sale
// del kit del uniforme de la empresa (CAR-408, CAR-504): cada tipo queda ligado a su prenda.
import type { Prenda } from "../uniforme/prendas";
import { claveCampo, type CampoTipo, type CategoriaTipo } from "./tipos";

export type TipoSugerido = {
  nombre: string;
  categoria: CategoriaTipo;
  descripcion: string | null;
  campos: CampoTipo[];
  tallas: string[];
  prendaClave: string | null;
};

const campo = (etiqueta: string, tipo: CampoTipo["tipo"] = "texto", obligatorio = false): CampoTipo => ({
  clave: claveCampo(etiqueta),
  etiqueta,
  tipo,
  obligatorio,
});

const activo = (nombre: string, descripcion: string, campos: CampoTipo[] = []): TipoSugerido => ({
  nombre,
  categoria: "activo",
  descripcion,
  campos,
  tallas: [],
  prendaClave: null,
});

const LETRAS = ["XS", "S", "M", "L", "XL", "XXL"];
const PANTALON = ["38", "40", "42", "44", "46", "48", "50", "52"];
const CALZADO = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"];

/** Tallas típicas según la prenda: numéricas para pantalones y calzado, por letra para lo demás. */
function tallasDe(clave: string): string[] {
  if (/pantal/.test(clave)) return PANTALON;
  if (/calzado|zapat|bota/.test(clave)) return CALZADO;
  return LETRAS;
}

const ropa = (p: Prenda): TipoSugerido => ({
  nombre: p.nombre,
  categoria: "ropa",
  descripcion: null,
  campos: [],
  tallas: tallasDe(p.clave),
  prendaClave: p.clave,
});

const TELEFONO = activo("Teléfono", "Teléfono corporativo del puesto o de la persona.", [
  campo("IMEI", "texto", true),
  campo("Modelo"),
  campo("Número de serie"),
]);
const LINEA = activo("Línea telefónica", "Número de teléfono contratado con un operador.", [
  campo("Número", "texto", true),
  campo("Operador", "texto", true),
  campo("Plan"),
]);

const ACTIVOS_POR_VERTICAL: Record<string, TipoSugerido[]> = {
  seguridad: [
    TELEFONO,
    LINEA,
    activo("Radio", "Radio portátil de comunicación.", [campo("Número de serie")]),
    activo("Linterna", "Linterna del puesto."),
    activo("Chaleco antibalas", "Chaleco de protección balística.", [
      campo("Número de serie", "texto", true),
      campo("Vencimiento", "fecha"),
    ]),
  ],
};

/** Tipos sugeridos: los activos típicos de la vertical y una prenda de ropa por cada prenda del kit. */
export function tiposSugeridos(vertical: string, prendas: Prenda[]): TipoSugerido[] {
  return [...(ACTIVOS_POR_VERTICAL[vertical] ?? [TELEFONO, LINEA]), ...prendas.map(ropa)];
}
