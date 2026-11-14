// Bloqueos de la fusión de cuentas (CAR-27, BRIEF-CAR-27-fusionar §4). Se evalúan dentro de la
// transacción de la fusión, con las dos cuentas bloqueadas.
import { reglaDeNegocio } from "../../errores";

export type Conteos = {
  contactos: number;
  instalaciones: number;
  negocios: number;
  documentos: number;
  actividad: number;
  facturas: number;
  facturasQueda: number;
  referencias: number;
};

export const SIN_CONTEOS: Conteos = {
  contactos: 0,
  instalaciones: 0,
  negocios: 0,
  documentos: 0,
  actividad: 0,
  facturas: 0,
  facturasQueda: 0,
  referencias: 0,
};

type Entrada = {
  a: { rut: string | null };
  b: { rut: string | null };
  rutFinal: string | null;
  mueve: Omit<Conteos, "facturasQueda">;
  facturasQueda: number;
  correos: string[];
};

export function validarFusion({ a, b, rutFinal, mueve, facturasQueda, correos }: Entrada): void {
  if (correos.length > 0)
    throw reglaDeNegocio(
      `Primero fusiona los contactos con el mismo correo en las dos cuentas: ${correos.join(", ")}.`,
    );
  if (mueve.referencias > 0)
    throw reglaDeNegocio(
      "El duplicado tiene registrado el consentimiento para usarlo como referencia comercial. Ese registro no se mueve: fusiona en sentido contrario (que quede el duplicado).",
    );
  // Las facturas están emitidas al RUT de su cuenta: ninguna puede quedar bajo otro RUT.
  if (mueve.facturas > 0 && b.rut && rutFinal !== b.rut)
    throw reglaDeNegocio(
      "El duplicado tiene facturas emitidas a su RUT. Para fusionar, el RUT que queda debe ser el del duplicado.",
    );
  if (facturasQueda > 0 && a.rut && rutFinal !== a.rut)
    throw reglaDeNegocio(
      "Esta cuenta tiene facturas emitidas a su RUT, así que su RUT no puede cambiar al fusionar.",
    );
}
