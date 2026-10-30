// Planificador de la migración de etiquetas QR de OPAI 1.0 (Brief 14 · PR 2, decisión de Carlos,
// pregunta 20: «se reutilizan y se mejoran»). Lógica pura y SOLO LECTURA: recibe los puntos de 1.0 ya
// exportados y devuelve el plan de qué se importaría a 2.0, sin tocar ninguna base (ni la de 1.0, que
// es solo lectura, ni la de 2.0). El código físico de 1.0 se reutiliza tal cual (sin firmar); la
// firma y la opacidad de 2.0 (R7) se aplican recién al reemplazar la etiqueta, sin obligar a
// reimprimir de inmediato.
//
// LIMITACIÓN DECLARADA (a verificar): el formato del contenido del QR impreso en 1.0 no está
// verificado contra el código de 1.0 en esta sesión (brecha de `rondas.md` §11). El planificador
// trata el campo `codigoQr` como el contenido literal de la etiqueta física; si al verificar 1.0
// resulta ser otra cosa (por ejemplo un ID interno predecible), hay que ajustar `normalizarCodigo`.

/** Punto de control exportado de 1.0 (formato supuesto; ver la limitación declarada arriba). */
export type Checkpoint1_0 = {
  /** Id interno del checkpoint en 1.0 (para trazar el origen, no se importa como id de 2.0). */
  id: string;
  nombre: string;
  /** Contenido del QR impreso en 1.0 (sin verificar el formato exacto). */
  codigoQr?: string | null;
  /** Modo de 1.0: `qr`, `gps`, `qr_gps` (NFC ya no existe en 2.0, decisión p.9). */
  modo?: string | null;
};

export type AccionImportacion = "importar" | "omitir";

export type PlanEtiqueta = {
  checkpointId: string;
  nombre: string;
  accion: AccionImportacion;
  /** Código físico de 1.0 que se reutilizaría, sin firmar; `null` si no hay QR que importar. */
  codigo: string | null;
  /** Siempre `false`: las etiquetas importadas no están firmadas hasta que se reemplacen (R7). */
  firmada: false;
  origen: "importada_1_0";
  advertencias: string[];
  motivoOmision?: string;
};

export type ResumenImportacion = {
  total: number;
  aImportar: number;
  omitidos: number;
  conAdvertencia: number;
  /** `false` hasta verificar el formato del QR en el código de 1.0 (ver limitación declarada). */
  formatoQrVerificado: boolean;
  planes: PlanEtiqueta[];
};

const incluyeQr = (modo: string | null | undefined) =>
  modo === "qr" || modo === "qr_gps" || modo == null;

/** Normaliza el código físico de 1.0 (recorta espacios). No inventa formato: lo deja tal cual. */
function normalizarCodigo(codigo: string | null | undefined): string | null {
  const c = (codigo ?? "").trim();
  return c.length > 0 ? c : null;
}

/**
 * Arma el plan de importación de las etiquetas de 1.0 a 2.0, en memoria. No escribe nada. Omite los
 * puntos cuyo código físico se repite (una etiqueta no puede identificar dos puntos) y avisa de los
 * puntos con QR sin código físico legible.
 */
export function planearImportacion1_0(
  checkpoints: readonly Checkpoint1_0[],
  opciones: { formatoQrVerificado?: boolean } = {},
): ResumenImportacion {
  const vistos = new Map<string, string>();
  const planes: PlanEtiqueta[] = checkpoints.map((c) => {
    const codigo = normalizarCodigo(c.codigoQr);
    const advertencias: string[] = [];
    if (codigo && vistos.has(codigo)) {
      return {
        checkpointId: c.id,
        nombre: c.nombre,
        accion: "omitir",
        codigo,
        firmada: false,
        origen: "importada_1_0",
        advertencias,
        motivoOmision: `Código físico duplicado (ya lo usa "${vistos.get(codigo)}").`,
      };
    }
    if (codigo) vistos.set(codigo, c.nombre);
    if (!codigo && incluyeQr(c.modo)) {
      advertencias.push(
        "Punto con QR sin código físico legible: habrá que reimprimir con el QR firmado de 2.0 o marcarlo por GPS.",
      );
    }
    return {
      checkpointId: c.id,
      nombre: c.nombre,
      accion: "importar",
      codigo,
      firmada: false,
      origen: "importada_1_0",
      advertencias,
    };
  });
  const aImportar = planes.filter((p) => p.accion === "importar").length;
  return {
    total: planes.length,
    aImportar,
    omitidos: planes.length - aImportar,
    conAdvertencia: planes.filter((p) => p.advertencias.length > 0).length,
    formatoQrVerificado: opciones.formatoQrVerificado ?? false,
    planes,
  };
}
