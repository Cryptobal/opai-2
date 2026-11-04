/** Utilidades puras de los campos con formato (hora HH:mm y montos con miles es-CL). */

/** Aplica la máscara «HH:mm» mientras se escribe (solo dígitos, máximo 4). */
export function aplicarMascaraHora(crudo: string): string {
  const d = crudo.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

/** «HH:mm» válido (00:00–23:59) o vacío si el texto está incompleto o fuera de rango. */
export function horaValida(texto: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(texto);
  if (!m) return "";
  return Number(m[1]) <= 23 && Number(m[2]) <= 59 ? texto : "";
}

/** Entero con puntos de miles (800000 → «800.000»); vacío si no hay dígitos. */
export function formatearMiles(digitos: string): string {
  const d = digitos.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Solo los dígitos de un texto con formato («800.000» → «800000»). */
export function soloDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}
