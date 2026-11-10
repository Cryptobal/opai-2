// Validación y armado del input de `finanzas.dte_config.actualizar` desde el formulario (CAR-240). Lógica pura.
import type { ConfigDte } from "./tipos";
import type { FormDte } from "./use-form-dte";

export type CampoDte = "acteco" | "resolucionNumero" | "resolucionFecha" | "umbral" | "avisoCaf";
export type ErroresDte = Partial<Record<CampoDte, string>>;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const entero = (t: string, min: number, max: number) => /^\d{1,6}$/.test(t.trim()) && +t >= min && +t <= max;

/** Errores por campo, antes de llamar a la capacidad. El N° de resolución 0 es válido (certificación). */
export function validarFormDte(f: FormDte): ErroresDte {
  const e: ErroresDte = {};
  const numero = f.resolucionNumero.trim();
  const fecha = f.resolucionFecha.trim();
  if (numero !== "" && !entero(numero, 0, 999_999)) e.resolucionNumero = "Use solo números, de 0 a 999.999.";
  else if (numero === "" && f.emisionProveedor === "simpleapi")
    e.resolucionNumero = "SimpleAPI requiere el N° de resolución (en certificación es 0).";
  else if (numero !== "" && +numero === 0 && f.ambiente === "produccion")
    e.resolucionNumero = "En producción indique la resolución vigente; el 0 solo existe en certificación.";
  const acteco = f.acteco.trim();
  if (acteco !== "" && !entero(acteco, 1, 999_999)) e.acteco = "Use el código de 6 dígitos del SII.";
  else if (acteco === "" && f.emisionProveedor === "simpleapi")
    e.acteco = "SimpleAPI requiere el ACTECO: sin él, el SII rechaza la factura.";
  if (fecha !== "" && !ISO.test(fecha)) e.resolucionFecha = "Indique una fecha válida (dd-mm-aaaa).";
  else if (fecha === "" && f.emisionProveedor === "simpleapi")
    e.resolucionFecha = "SimpleAPI requiere la fecha de la resolución.";
  if (!entero(f.umbral, 1, 100)) e.umbral = "Indique un porcentaje de 1 a 100.";
  if (!entero(f.avisoCaf, 1, 365)) e.avisoCaf = "Indique de 1 a 365 días.";
  return e;
}

/**
 * Input de la capacidad. El N° 0 se envía como 0, nunca como vacío. Los conectores solo viajan si cambiaron: cambiarlos
 * exige owner humano, y un admin que solo ajusta umbrales no debe chocar con esa regla.
 */
export function inputDteDesdeForm(f: FormDte, vigente: Pick<ConfigDte, "emisionProveedor" | "cesionProveedor">) {
  const numero = f.resolucionNumero.trim();
  const cesion = f.cesionProveedor === "octava" ? ("octava" as const) : null;
  return {
    ambiente: f.ambiente,
    rutEmisor: f.rutEmisor.trim() || undefined,
    acteco: f.acteco.trim() === "" ? null : Number(f.acteco.trim()),
    ...(f.emisionProveedor !== vigente.emisionProveedor ? { emisionProveedor: f.emisionProveedor } : {}),
    ...(cesion !== vigente.cesionProveedor ? { cesionProveedor: cesion } : {}),
    resolucionSiiNumero: numero === "" ? null : Number(numero),
    resolucionSiiFecha: f.resolucionFecha.trim() || null,
    umbralFoliosPct: Number(f.umbral),
    avisoCafDias: Number(f.avisoCaf),
    fechaCorte1_0: f.fechaCorte.trim() || null,
  };
}
