// Validación de los valores que llegan a una ficha contra su catálogo (CAR-27, CAR-536).
import {
  validarValorCampo,
  type FormatoNumeroCampo,
  type TipoCampoPersonalizado,
  type ValorCampoPersonalizado,
} from "@opai/domain";

import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { usuariosErp } from "./usuarios-erp";

export type CampoActivo = {
  id: string;
  clave: string;
  etiqueta: string;
  descripcion: string | null;
  tipo: string;
  formato: string | null;
  opciones: string[];
  opcionesEtiquetas: string[];
  obligatorio: boolean;
  valorDefecto: unknown;
};

/** Valida cada clave contra su campo; un usuario además debe ser usuario activo del ERP. */
export async function validarEntrada(
  ctx: Contexto,
  campos: CampoActivo[],
  entrada: Record<string, ValorCampoPersonalizado>,
) {
  const porClave = new Map(campos.map((c) => [c.clave, c]));
  const errores: Record<string, string> = {};
  const cambios: { campoId: string; valor: ValorCampoPersonalizado }[] = [];
  const conUsuario = campos.some((c) => c.tipo === "usuario" && entrada[c.clave] != null);
  const usuarios = new Set(conUsuario ? (await usuariosErp(ctx)).map((u) => u.id) : []);
  for (const [clave, bruto] of Object.entries(entrada)) {
    const campo = porClave.get(clave);
    if (!campo) {
      errores[clave] = "No existe un campo activo con esa clave.";
      continue;
    }
    const tipo = campo.tipo as TipoCampoPersonalizado;
    const r = validarValorCampo({ tipo, opciones: campo.opciones, formato: campo.formato as FormatoNumeroCampo | null }, bruto);
    if (!r.ok) errores[clave] = r.error;
    else if (r.valor === null && campo.obligatorio) errores[clave] = "Es obligatorio.";
    else if (tipo === "usuario" && r.valor !== null && !usuarios.has(r.valor as string))
      errores[clave] = "Debe ser un usuario activo de la empresa.";
    else cambios.push({ campoId: campo.id, valor: r.valor });
  }
  if (Object.keys(errores).length > 0) {
    const detalle = Object.entries(errores)
      .map(([clave, e]) => `${porClave.get(clave)?.etiqueta ?? clave}: ${e}`)
      .join(" ");
    throw reglaDeNegocio(`Revisa los campos. ${detalle}`, { errores });
  }
  return cambios;
}
