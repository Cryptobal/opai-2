import { CAMPOS_BANCO } from "./campos-banco";
import type { ConfigSeccion } from "./config-hojas-laboral";

/** CAR-275: agregar otra cuenta bancaria; queda pendiente de RRHH igual que un cambio. */
export const HOJA_PAGO_AGREGAR: ConfigSeccion = {
  param: "agregar-cuenta",
  titulo: "Agregar cuenta bancaria",
  capacidad: "core.personas.pago_solicitar_cambio",
  exito: "Solicitud registrada: queda pendiente de aprobación de RRHH",
  boton: "Solicitar cuenta",
  todos: true,
  campos: [
    ...CAMPOS_BANCO,
    { clave: "numeroCuenta", etiqueta: "Número de cuenta", tipo: "texto", max: 40, requerido: true },
    { clave: "rutTitular", etiqueta: "RUT del titular (opcional)", tipo: "texto", max: 20 },
    { clave: "titularNombre", etiqueta: "Nombre del titular (opcional)", tipo: "texto", max: 120 },
    { clave: "porDefecto", etiqueta: "Dejarla como cuenta por defecto", tipo: "si_no" },
  ],
  armar: (id, { porDefecto, rutTitular, titularNombre, ...c }) => ({
    id,
    tipo: "agregar",
    ...c,
    porDefecto: porDefecto === "si",
    ...(rutTitular ? { rutTitular } : {}),
    ...(titularNombre ? { titularNombre } : {}),
  }),
};
