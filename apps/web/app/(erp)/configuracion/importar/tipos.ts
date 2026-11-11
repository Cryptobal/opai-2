export type CampoCatalogo = {
  clave: string; etiqueta: string; tipo: string; requerido: boolean; ayuda: string | null; ejemplo: string; opciones: string[];
};
export type ImportadorCatalogo = { id: string; etiqueta: string; descripcion: string; disponible: boolean; campos: CampoCatalogo[] };
export type Catalogo = {
  importadores: ImportadorCatalogo[];
  limites: { filasPorLlamada: number; filasPorArchivo: number; megabytes: number };
};

export type Accion = "crear" | "actualizar" | "sin_cambio" | "error";
export type Conteos = Record<Accion, number>;
export type FilaVista = { fila: number; accion: Accion; etiqueta: string; mensajes: string[]; cambios: string[] };
export type Resultado = {
  simulacion: boolean;
  columnas: string[];
  mapeo: Record<string, string | null>;
  columnasIgnoradas: string[];
  bloqueos: string[];
  totalFilas: number;
  desde: number;
  siguiente: number | null;
  conteos: Conteos;
  filas: FilaVista[];
  importacionId: string | null;
};

export type Lote = {
  id: string; importador: string; archivo: string | null; origen: string;
  estado: "en_curso" | "completada" | "fallida" | "revertida"; conteos: Conteos;
  lanzadaPor: string | null; iniciadaEn: string; revertidaEn: string | null;
};

export type Archivo = { nombre: string; contenidoBase64: string };
export type AlExistir = "completar" | "sobrescribir" | "omitir";

export const CEROS: Conteos = { crear: 0, actualizar: 0, sin_cambio: 0, error: 0 };
export const sumar = (a: Conteos, b: Conteos): Conteos => ({
  crear: a.crear + b.crear, actualizar: a.actualizar + b.actualizar, sin_cambio: a.sin_cambio + b.sin_cambio, error: a.error + b.error,
});

/** Tamaño máximo por archivo en pantalla: lo que acepta una acción de servidor con holgura. */
export const MAX_MB_PANTALLA = 0.7;

/** Lee un archivo del navegador como base64 (sin el prefijo `data:`). */
export function aBase64(archivo: File): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onerror = () => rechazar(new Error("No se pudo leer el archivo."));
    lector.onload = () => resolver(String(lector.result).split(",")[1] ?? "");
    lector.readAsDataURL(archivo);
  });
}

/** Descarga en el navegador un archivo que llegó en base64. */
export function descargar(nombre: string, mime: string, base64: string): void {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}
