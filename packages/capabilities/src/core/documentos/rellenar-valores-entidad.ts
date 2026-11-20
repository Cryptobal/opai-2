// Valores de las variables de una plantilla de cuenta o de instalación (CAR-315 parte 2, CAR-421). Todo sale de
// la ficha dentro del alcance del actor (`cuentaDe` e `instalacionDe` aplican el filtro por filas); lo
// que no existe no se inventa: queda sin valor y con su motivo.
import {
  claveVariableCampoCuenta,
  etiquetasCamposCuenta,
  formatearRut,
  mostrarValorCampo,
  type AmbitoPlantilla,
} from "@opai/domain";

import type { Contexto } from "../../types";
import { leerValores } from "../crm/campos-valores-comun";
import { cuentaDe } from "../maestros/cuentas-acceso";
import { instalacionDe } from "../maestros/instalaciones";

type Cuenta = { nombre: string; razonSocial: string | null; rut: string | null; giro: string | null; calle: string | null; comuna: string | null };
type Valores = Record<string, string | null>;
const unir = (...p: (string | null | undefined)[]) => p.map((x) => x?.trim()).filter(Boolean).join(", ") || null;

function deCuenta(c: Cuenta): Valores {
  return {
    "cuenta.nombre": c.nombre,
    "cuenta.razon_social": c.razonSocial,
    "cuenta.rut": c.rut ? formatearRut(c.rut) : null,
    "cuenta.direccion": unir(c.calle, c.comuna),
    "cuenta.giro": c.giro,
  };
}

async function camposCuentaEnValores(ctx: Contexto, cuentaId: string) {
  const salida = await leerValores(ctx, { entidad: "cuenta", id: cuentaId });
  const valores: Valores = {};
  const motivos: Record<string, string> = {};
  for (const c of salida.campos) {
    const clave = claveVariableCampoCuenta(c.clave);
    valores[clave] = mostrarValorCampo(c, c.valor);
    if (!valores[clave])
      motivos[clave] = "Falta el dato en la ficha de la cuenta. Complétalo y vuelve a intentar.";
  }
  return { valores, motivos, etiquetas: etiquetasCamposCuenta(salida.campos) };
}

/** Valores y motivos de lo que falta; `nombre` es el de la cuenta o instalación para el título del PDF. */
export async function valoresDeEntidad(ctx: Contexto, ambito: Exclude<AmbitoPlantilla, "persona">, id: string) {
  let nombre: string;
  let valores: Valores;
  let motivosExtras: Record<string, string>;
  let etiquetasCampos: Map<string, string>;
  if (ambito === "cuenta") {
    const c = await cuentaDe(ctx, id);
    nombre = c.nombre;
    valores = deCuenta(c);
    const extras = await camposCuentaEnValores(ctx, id);
    valores = { ...valores, ...extras.valores };
    motivosExtras = extras.motivos;
    etiquetasCampos = new Map(extras.etiquetas);
  } else {
    const i = await instalacionDe(ctx, id);
    const c = await cuentaDe(ctx, i.cuentaId);
    nombre = i.nombre;
    valores = {
      "instalacion.nombre": i.nombre,
      "instalacion.direccion": i.direccionFormateada ?? unir(i.calle, i.comuna),
      ...deCuenta(c),
    };
    const extras = await camposCuentaEnValores(ctx, i.cuentaId);
    valores = { ...valores, ...extras.valores };
    motivosExtras = extras.motivos;
    etiquetasCampos = new Map(extras.etiquetas);
  }
  const motivos: Record<string, string> = { ...motivosExtras };
  const donde = ambito === "cuenta" ? "la ficha de la cuenta" : "la instalación o su cuenta";
  for (const [k, val] of Object.entries(valores))
    if (!val && !motivos[k]) motivos[k] = `Falta el dato en ${donde}. Complétalo y vuelve a intentar.`;
  return { nombre, valores, motivos, etiquetasCampos };
}