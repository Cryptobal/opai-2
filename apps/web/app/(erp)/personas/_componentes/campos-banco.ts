import { BANCOS_SBIF, TIPOS_CUENTA_BANCARIA } from "@opai/domain";

import type { CampoLaboral } from "./config-hojas-laboral";

/** CAR-244: banco por código SBIF (buscable por nombre o código) y tipo de cuenta, nunca texto libre. */
export const CAMPOS_BANCO: readonly CampoLaboral[] = [
  {
    clave: "bancoCodigo",
    etiqueta: "Banco",
    tipo: "opcion",
    requerido: true,
    buscable: true,
    // El código SBIF va en la etiqueta para poder buscar por él.
    opciones: BANCOS_SBIF.map((b) => ({ valor: b.codigo, etiqueta: `${b.nombre} · ${b.codigo}` })),
  },
  {
    clave: "tipoCuenta",
    etiqueta: "Tipo de cuenta",
    tipo: "opcion",
    requerido: true,
    opciones: TIPOS_CUENTA_BANCARIA,
  },
];
