// Tipos del dominio de Asistencia. Puro: sin Next, React ni base de datos.

export const TIPOS_MARCA = ["entrada", "salida", "inicio_colacion", "fin_colacion"] as const;
export type TipoMarca = (typeof TIPOS_MARCA)[number];

export const METODOS = ["rostro", "rut_pin", "pin_respaldo", "manual_contingencia"] as const;
export type Metodo = (typeof METODOS)[number];

export const ORIGENES_MARCA = ["en_linea", "offline_queue", "contingencia", "importacion"] as const;
export type OrigenMarca = (typeof ORIGENES_MARCA)[number];

export const CANALES = ["kiosco", "telefono_personal"] as const;
export type Canal = (typeof CANALES)[number];

export const GPS_ESTADOS = ["dentro", "fuera", "sin_gps"] as const;
export type GpsEstado = (typeof GPS_ESTADOS)[number];

/** Horas hacia atrás que se miran para decidir si toca entrada o salida (12×12 y nocturnos). */
export const VENTANA_TIPO_HORAS = 26;

export type MarcaPrevia = { tipo: TipoMarca; horaServidor: Date };
