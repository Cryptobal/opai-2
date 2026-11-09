import { normalizarRut } from "../rut";

export type TipoDocumento = "run" | "pasaporte" | "otro";

export type DocumentoNormalizado = {
  tipo: TipoDocumento;
  /** Forma canónica con la que se compara contra las listas (RUN `12345678-5`, pasaporte `PAIS:NUMERO`). */
  clave: string;
  /** Forma enmascarada para el cliente, reportes y exportaciones (R17). */
  mascara: string;
};

/** `12345678-5` → `12.3••.•••-5`: deja el primer dígito del cuerpo, el segundo grupo parcial y el verificador. */
function mascaraRun(rut: string): string {
  const [cuerpo, dv] = rut.split("-") as [string, string];
  const puntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const visible = puntos.slice(0, puntos.indexOf(".") + 2);
  return `${visible}${puntos.slice(visible.length).replace(/\d/g, "•")}-${dv}`;
}

/**
 * Normaliza lo que el guardia leyó o escribió (R4, R5). El RUN exige dígito verificador; el pasaporte exige país
 * (código de 2 o 3 letras) y número alfanumérico. Devuelve null si no es utilizable: «documento leído» no
 * significa «documento vigente».
 */
export function normalizarDocumento(d: {
  tipo: TipoDocumento;
  numero: string;
  pais?: string;
}): DocumentoNormalizado | null {
  if (d.tipo === "run") {
    const rut = normalizarRut(d.numero);
    return rut ? { tipo: "run", clave: rut, mascara: mascaraRun(rut) } : null;
  }
  const numero = d.numero.replace(/[\s-]/g, "").toUpperCase();
  const pais = (d.pais ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{5,20}$/.test(numero) || !/^[A-Z]{2,3}$/.test(pais)) return null;
  const visible = numero.slice(-2);
  return {
    tipo: d.tipo,
    clave: `${pais}:${numero}`,
    mascara: `${pais}:${"•".repeat(numero.length - 2)}${visible}`,
  };
}

/** Patente chilena o extranjera libre: mayúsculas, sin espacios ni guiones; null si queda vacía o con símbolos. */
export function normalizarPatente(p: string): string | null {
  const limpia = p.replace(/[\s.-]/g, "").toUpperCase();
  return /^[A-Z0-9]{4,10}$/.test(limpia) ? limpia : null;
}
