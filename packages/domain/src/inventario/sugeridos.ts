// Tipos sugeridos por vertical (CAR-235, R6): lo típico del rubro para empezar con un clic.
// Las prendas de ropa siguen el kit de uniforme de Personas (CAR-408) con la misma clave.
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

const ropa = (nombre: string, tallas = LETRAS): TipoSugerido => ({
  nombre,
  categoria: "ropa",
  descripcion: null,
  campos: [],
  tallas,
  prendaClave: claveCampo(nombre),
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

const ROPA_POR_VERTICAL: Record<string, TipoSugerido[]> = {
  seguridad: [
    ropa("Camisa"),
    ropa("Pantalón", PANTALON),
    ropa("Chaqueta"),
    ropa("Polera"),
    ropa("Geólogo"),
    ropa("Polar"),
    ropa("Calzado", CALZADO),
  ],
  aseo: [ropa("Cotona"), ropa("Pantalón", PANTALON), ropa("Polera"), ropa("Polar"), ropa("Calzado", CALZADO)],
  mantenimiento: [ropa("Overol"), ropa("Polera"), ropa("Chaqueta"), ropa("Calzado de seguridad", CALZADO)],
};

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

/** Tipos sugeridos de una vertical; una vertical sin lista propia recibe los básicos. */
export function tiposSugeridos(vertical: string): TipoSugerido[] {
  const activos = ACTIVOS_POR_VERTICAL[vertical] ?? [TELEFONO, LINEA];
  const prendas = ROPA_POR_VERTICAL[vertical] ?? [
    ropa("Camisa"),
    ropa("Pantalón", PANTALON),
    ropa("Calzado", CALZADO),
  ];
  return [...activos, ...prendas];
}
